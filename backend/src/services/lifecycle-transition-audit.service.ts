import { DBAdminAuditLog } from '@shared/db/src'
import { getRequestContext } from '@/lib/context'
import logger from '@/lib/logger'
import {
  createAdminAuditLog,
  listAdminAuditLogs,
} from '@/repositories/governance.repository'

export const TRANSITION_AUDIT_ACTION_PREFIX = 'lifecycle.transition'

export const TRANSITION_DOMAINS = {
  LIFECYCLE: 'lifecycle',
  BILLING: 'billing',
  PROVISIONING: 'provisioning',
} as const

export type TransitionDomain =
  (typeof TRANSITION_DOMAINS)[keyof typeof TRANSITION_DOMAINS]

export type TransitionSource = 'api' | 'worker' | 'admin' | 'system'

export interface TransitionAuditEvent {
  id: string
  organizationId: string
  domain: TransitionDomain
  fromState: string
  toState: string
  source: TransitionSource
  reason: string | null
  correlationId: string | null
  actorUserId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface EmitTransitionAuditEventInput {
  organizationId: string
  domain: TransitionDomain
  fromState: string
  toState: string
  source: TransitionSource
  reason?: string | null
  correlationId?: string | null
  actorUserId?: string | null
  metadata?: Record<string, unknown> | null
}

interface ListTransitionAuditEventsInput {
  organizationId?: string
  domain?: TransitionDomain
  correlationId?: string
  limit?: number
}

export interface TransitionAuditRepository {
  create: typeof createAdminAuditLog
  list: typeof listAdminAuditLogs
}

const defaultTransitionAuditRepository: TransitionAuditRepository = {
  create: createAdminAuditLog,
  list: listAdminAuditLogs,
}

let transitionAuditRepository: TransitionAuditRepository =
  defaultTransitionAuditRepository

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const isTransitionDomain = (value: unknown): value is TransitionDomain => {
  return (
    value === TRANSITION_DOMAINS.LIFECYCLE ||
    value === TRANSITION_DOMAINS.BILLING ||
    value === TRANSITION_DOMAINS.PROVISIONING
  )
}

const normalizeLimit = (value: number | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 50
  }

  return Math.max(1, Math.min(200, Math.floor(value)))
}

const parseTransitionAuditLog = (
  log: DBAdminAuditLog,
): TransitionAuditEvent | null => {
  if (!log.action.startsWith(`${TRANSITION_AUDIT_ACTION_PREFIX}.`)) {
    return null
  }

  const before = asRecord(log.before)
  const after = asRecord(log.after)
  const domain = asString(after?.domain)
  const fromState = asString(before?.state)
  const toState = asString(after?.state)
  const source = asString(after?.source)

  if (
    !domain ||
    !isTransitionDomain(domain) ||
    !fromState ||
    !toState ||
    (source !== 'api' &&
      source !== 'worker' &&
      source !== 'admin' &&
      source !== 'system')
  ) {
    return null
  }

  return {
    id: log.id,
    organizationId:
      asString(log.organizationId) ||
      asString(after?.organizationId) ||
      'unknown',
    domain,
    fromState,
    toState,
    source,
    reason: asString(after?.reason),
    correlationId:
      asString(after?.correlationId) || asString(before?.correlationId),
    actorUserId: asString(log.actorUserId),
    metadata: asRecord(after?.metadata),
    createdAt: new Date(log.createdAt).toISOString(),
  }
}

export const setTransitionAuditRepositoryForTests = (
  repository: TransitionAuditRepository,
) => {
  transitionAuditRepository = repository
}

export const resetTransitionAuditRepositoryForTests = () => {
  transitionAuditRepository = defaultTransitionAuditRepository
}

export const emitTransitionAuditEvent = async (
  input: EmitTransitionAuditEventInput,
): Promise<TransitionAuditEvent | null> => {
  const context = getRequestContext()
  const correlationId =
    asString(input.correlationId) ||
    asString(context?.correlationId) ||
    asString(context?.requestId)
  const actorUserId = asString(input.actorUserId) || asString(context?.userId)
  const reason = asString(input.reason)
  const metadata = asRecord(input.metadata) || null

  try {
    const persisted = await transitionAuditRepository.create({
      organizationId: input.organizationId,
      actorUserId,
      action: `${TRANSITION_AUDIT_ACTION_PREFIX}.${input.domain}`,
      resourceType: 'lifecycle_transition',
      resourceId: `${input.domain}:${input.organizationId}:${input.toState}`,
      before: {
        state: input.fromState,
        correlationId,
      },
      after: {
        state: input.toState,
        domain: input.domain,
        source: input.source,
        reason,
        organizationId: input.organizationId,
        correlationId,
        metadata,
      },
      ipAddress: null,
      userAgent: null,
    })

    return {
      id: persisted.id,
      organizationId: input.organizationId,
      domain: input.domain,
      fromState: input.fromState,
      toState: input.toState,
      source: input.source,
      reason,
      correlationId,
      actorUserId,
      metadata,
      createdAt: new Date(persisted.createdAt).toISOString(),
    }
  } catch (error) {
    logger.warn(
      { error, input, correlationId },
      'Failed to persist transition audit event',
    )
    return null
  }
}

export const listTransitionAuditEvents = async (
  input: ListTransitionAuditEventsInput = {},
): Promise<TransitionAuditEvent[]> => {
  const limit = normalizeLimit(input.limit)
  const fetchLimit = Math.max(limit * 4, 100)
  const rows = await transitionAuditRepository.list(input.organizationId, fetchLimit)

  let events = rows
    .map((row) => parseTransitionAuditLog(row))
    .filter((event): event is TransitionAuditEvent => Boolean(event))

  if (input.domain) {
    events = events.filter((event) => event.domain === input.domain)
  }

  const correlationId = asString(input.correlationId)
  if (correlationId) {
    events = events.filter((event) => event.correlationId === correlationId)
  }

  return events.slice(0, limit)
}
