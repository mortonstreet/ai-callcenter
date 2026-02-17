import { randomUUID } from 'crypto'
import { getRequestContext } from '@/lib/context'
import { db } from '@/lib/db'
import { parseLifecycleMetadata } from '@/lib/lifecycle-gates.core'
import logger from '@/lib/logger'
import { findMember } from '@/repositories/organization.repository'
import {
  findAgentProvisioningJobById,
  findLatestAgentProvisioningJobByAgentId,
  listAgentProvisioningSteps,
} from '@/repositories/provisioning.repository'
import { AgentExternalType, OrganizationRole } from '@shared/types/src'
import { recordWizardProvisioningJobMetric } from './operations-metrics.service'
import { retryProvisioningJob as retryProvisioningOrchestrationJob } from './provisioning-orchestrator.service'

export type ProvisioningJobStatus =
  | 'queued'
  | 'running'
  | 'retrying'
  | 'failed'
  | 'completed'
  | 'blocked_manual'

export type ProvisioningReadiness = 'healthy' | 'degraded' | 'blocked'

export type ProvisioningStepStatus =
  | 'pending'
  | 'running'
  | 'failed'
  | 'completed'
  | 'skipped'

export type ProvisioningRolloutCohort = 'internal' | 'demo' | 'general'

export interface ProvisioningStepTimelineItem {
  id: string
  name: string
  order: number
  status: ProvisioningStepStatus
  attempt: number
  startedAt: string | null
  completedAt: string | null
  errorCode: string | null
  errorMessage: string | null
  remediationAction: string | null
  correlationId: string
}

export interface ProvisioningRetryState {
  eligible: boolean
  retryCount: number
  maxRetries: number
  lastRetriedAt: string | null
  lastRetriedByUserId: string | null
  recommendedAction: string
}

export interface ProvisioningLastError {
  code: string
  message: string
  stepId: string | null
  occurredAt: string
}

export interface ProvisioningRolloutState {
  cohort: ProvisioningRolloutCohort
  featureEnabled: boolean
  canary: boolean
  paused: boolean
  pausedReason: string | null
  profileVersion: string
}

export interface ProvisioningStatusResponse {
  jobId: string
  organizationId: string
  agentId: string | null
  status: ProvisioningJobStatus
  readiness: ProvisioningReadiness
  startedAt: string
  updatedAt: string
  completedAt: string | null
  correlationId: string
  lastError: ProvisioningLastError | null
  retry: ProvisioningRetryState
  rollout: ProvisioningRolloutState
  links: {
    agentHealth: string | null
    recentLogs: string | null
  }
  steps: ProvisioningStepTimelineItem[]
}

export interface ProvisioningStepsResponse {
  jobId: string
  status: ProvisioningJobStatus
  correlationId: string
  steps: ProvisioningStepTimelineItem[]
}

type OrganizationRecord = {
  id: string
  name: string
  slug: string
  metadata: string | null
  createdAt: Date
}

type AgentRecord = {
  id: string
  organizationId: string
  name: string
  createdAt: Date
  updatedAt: Date
  externalType: string
  status: string
  syncPending: boolean
  lastSyncError: string | null
  providerCorrelationKey: string | null
  industry: string | null
  useCase: string | null
  website: string | null
  mainGoal: string | null
  voiceId: string | null
  readinessStatus: string | null
  promptProfileVersion: string | null
}

type ProvisioningJobRecord =
  Awaited<ReturnType<typeof findAgentProvisioningJobById>> extends infer T
    ? NonNullable<T>
    : never

type ProvisioningStepRecord = Awaited<
  ReturnType<typeof listAgentProvisioningSteps>
>[number]

type WizardRolloutMetadata = {
  cohort?: ProvisioningRolloutCohort
  featureEnabled?: boolean
  paused?: boolean
  pausedReason?: string | null
  updatedAt?: string
  updatedByUserId?: string | null
}

export class ProvisioningNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProvisioningNotFoundError'
  }
}

export class ProvisioningForbiddenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProvisioningForbiddenError'
  }
}

export class ProvisioningRetryNotEligibleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProvisioningRetryNotEligibleError'
  }
}

const MAX_RETRY_ATTEMPTS = 5
const CANARY_COHORTS = new Set<ProvisioningRolloutCohort>(['internal', 'demo'])
const RETRY_ELIGIBLE_STATUSES = new Set<ProvisioningJobStatus>([
  'failed',
  'blocked_manual',
  'retrying',
])

const STEP_NAME_BY_ID: Record<string, string> = {
  validate_request: 'Validate request and policy',
  compile_intent_profile: 'Build wizard intent profile',
  compile_prompt: 'Compile prompt and greeting',
  create_or_update_agent: 'Create or sync provider agent',
  apply_core_tabs_profile: 'Apply core tab profile',
  ingest_knowledge_sources: 'Ingest knowledge sources',
  attach_webhooks_and_mcp: 'Attach webhooks and MCP integrations',
  register_and_run_smoke_tests: 'Run readiness and smoke checks',
  persist_versions_and_sync: 'Finalize activation state',
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

const asBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null

const isRolloutCohort = (value: unknown): value is ProvisioningRolloutCohort =>
  value === 'internal' || value === 'demo' || value === 'general'

const toIso = (value: Date | string | null | undefined): string | null => {
  if (!value) return null
  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

const nowIso = () => new Date().toISOString()

const resolveCorrelationId = (fallback: string | null): string =>
  asString(fallback) ||
  getRequestContext()?.correlationId ||
  `wizard-${randomUUID().slice(0, 12)}`

const toJobStatus = (value: unknown): ProvisioningJobStatus => {
  if (
    value === 'queued' ||
    value === 'running' ||
    value === 'retrying' ||
    value === 'failed' ||
    value === 'completed' ||
    value === 'blocked_manual'
  ) {
    return value
  }
  return 'failed'
}

const toStepStatus = (value: unknown): ProvisioningStepStatus => {
  if (
    value === 'pending' ||
    value === 'running' ||
    value === 'failed' ||
    value === 'completed' ||
    value === 'skipped'
  ) {
    return value
  }
  return 'pending'
}

const parseWizardRollout = (
  metadata: Record<string, unknown>,
): WizardRolloutMetadata => {
  const wizard = isRecord(metadata.wizardV2) ? metadata.wizardV2 : {}
  const rollout = isRecord(wizard.rollout) ? wizard.rollout : {}

  return {
    cohort: isRolloutCohort(rollout.cohort) ? rollout.cohort : undefined,
    featureEnabled: asBoolean(rollout.featureEnabled) ?? undefined,
    paused: asBoolean(rollout.paused) ?? undefined,
    pausedReason: asString(rollout.pausedReason),
    updatedAt: asString(rollout.updatedAt) || undefined,
    updatedByUserId: asString(rollout.updatedByUserId),
  }
}

const resolveRolloutState = (input: {
  organization: OrganizationRecord
  rollout: WizardRolloutMetadata
  profileVersion: string
}) => {
  const cohort =
    input.rollout.cohort || resolveWizardRolloutCohort(input.organization)
  const canary = CANARY_COHORTS.has(cohort)
  const featureEnabled =
    typeof input.rollout.featureEnabled === 'boolean'
      ? input.rollout.featureEnabled
      : canary
  const paused = input.rollout.paused === true
  const pausedReason = input.rollout.pausedReason || null

  return {
    cohort,
    canary,
    featureEnabled,
    paused,
    pausedReason,
    profileVersion: input.profileVersion,
  }
}

export const resolveWizardRolloutCohort = (organization: {
  slug: string
  metadata: unknown
}): ProvisioningRolloutCohort => {
  const lifecycleMetadata = parseLifecycleMetadata(organization.metadata)
  const planType = asString(lifecycleMetadata.planType)
  if (planType === 'demo') {
    return 'demo'
  }

  if (
    organization.slug.includes('internal') ||
    organization.slug.startsWith('int-') ||
    organization.slug.startsWith('demo-internal')
  ) {
    return 'internal'
  }

  return 'general'
}

export const resolveWizardRolloutForOrganization = (input: {
  organization: { slug: string; metadata: unknown }
  rollout?: {
    cohort?: ProvisioningRolloutCohort
    featureEnabled?: boolean
    paused?: boolean
    pausedReason?: string | null
  }
  profileVersion?: string
}) => {
  const simulatedOrganization: OrganizationRecord = {
    id: 'org_test',
    name: 'Test Org',
    slug: input.organization.slug,
    metadata: (() => {
      if (typeof input.organization.metadata === 'string') {
        return input.organization.metadata
      }
      if (isRecord(input.organization.metadata)) {
        return JSON.stringify(input.organization.metadata)
      }
      return null
    })(),
    createdAt: new Date(),
  }

  return resolveRolloutState({
    organization: simulatedOrganization,
    rollout: {
      cohort: input.rollout?.cohort,
      featureEnabled: input.rollout?.featureEnabled,
      paused: input.rollout?.paused,
      pausedReason: input.rollout?.pausedReason || null,
    },
    profileVersion: input.profileVersion || 'legacy_unknown',
  })
}

const resolveAgentReadiness = (
  agent: AgentRecord | null,
): ProvisioningReadiness => {
  if (!agent) return 'blocked'

  if (agent.readinessStatus === 'blocked') return 'blocked'
  if (agent.readinessStatus === 'degraded') return 'degraded'
  if (agent.readinessStatus === 'ready') return 'healthy'

  if (agent.externalType === AgentExternalType.LOCAL_FALLBACK) return 'degraded'
  if (agent.syncPending || agent.status === 'error') return 'degraded'

  return 'healthy'
}

const resolveStepName = (stepId: string): string =>
  STEP_NAME_BY_ID[stepId] || stepId.replace(/_/g, ' ')

const resolveRetryMetadata = (runtimeState: unknown) => {
  const runtime = isRecord(runtimeState) ? runtimeState : {}
  const manualRetryRequest = isRecord(runtime.manualRetryRequest)
    ? runtime.manualRetryRequest
    : {}

  return {
    lastRetriedAt: asString(manualRetryRequest.requestedAt),
    lastRetriedByUserId: asString(manualRetryRequest.requestedByUserId),
  }
}

const getAgentById = async (agentId: string): Promise<AgentRecord | null> => {
  return (
    (await db
      .selectFrom('agent')
      .where('id', '=', agentId)
      .select([
        'id',
        'organizationId',
        'name',
        'createdAt',
        'updatedAt',
        'externalType',
        'status',
        'syncPending',
        'lastSyncError',
        'providerCorrelationKey',
        'industry',
        'useCase',
        'website',
        'mainGoal',
        'voiceId',
        'readinessStatus',
        'promptProfileVersion',
      ])
      .executeTakeFirst()) || null
  )
}

const getOrganizationById = async (
  organizationId: string,
): Promise<OrganizationRecord | null> => {
  return (
    (await db
      .selectFrom('organization')
      .where('id', '=', organizationId)
      .select(['id', 'name', 'slug', 'metadata', 'createdAt'])
      .executeTakeFirst()) || null
  )
}

const assertOrganizationAccess = async (input: {
  organizationId: string
  userId: string
  isAdmin: boolean
  requireRetryRole?: boolean
}) => {
  if (input.isAdmin) {
    return
  }

  const membership = await findMember(input.organizationId, input.userId)
  if (!membership) {
    throw new ProvisioningForbiddenError(
      'You do not have access to this provisioning job.',
    )
  }

  if (
    input.requireRetryRole &&
    membership.role !== OrganizationRole.ADMIN &&
    membership.role !== OrganizationRole.OWNER
  ) {
    throw new ProvisioningForbiddenError(
      'Only organization admins or owners can retry provisioning.',
    )
  }
}

const loadProvisioningSnapshot = async (jobId: string) => {
  const job = await findAgentProvisioningJobById(jobId)
  if (!job) {
    throw new ProvisioningNotFoundError(
      `Provisioning job ${jobId} was not found.`,
    )
  }

  const [organization, steps] = await Promise.all([
    getOrganizationById(job.organizationId),
    listAgentProvisioningSteps(job.id),
  ])

  if (!organization) {
    throw new ProvisioningNotFoundError(
      `Organization ${job.organizationId} was not found for provisioning job ${jobId}.`,
    )
  }

  const agent = job.agentId ? await getAgentById(job.agentId) : null

  return {
    job,
    steps,
    organization,
    agent,
  }
}

const buildRecommendedAction = (input: {
  status: ProvisioningJobStatus
  retryCount: number
  rollout: ProvisioningRolloutState
  hasAgent: boolean
}) => {
  if (input.retryCount >= MAX_RETRY_ATTEMPTS) {
    return 'Retry limit reached. Escalate to support.'
  }
  if (!input.rollout.featureEnabled) {
    return 'Wizard v2 rollout is disabled for this cohort. Contact support for activation.'
  }
  if (input.rollout.paused) {
    return (
      input.rollout.pausedReason ||
      'Rollout is paused. Retry is temporarily disabled.'
    )
  }
  if (!input.hasAgent) {
    return 'No provisioning agent is attached. Create or link an agent before retrying.'
  }
  if (input.status === 'completed') {
    return 'Provisioning completed successfully.'
  }
  if (input.status === 'running') {
    return 'Provisioning is actively running. No manual action needed.'
  }
  if (input.status === 'queued' || input.status === 'retrying') {
    return 'Provisioning is waiting for orchestration. Trigger a manual retry if it appears stalled.'
  }

  return 'Retry provider provisioning after confirming upstream provider health.'
}

const buildStepTimeline = (input: {
  steps: ProvisioningStepRecord[]
  correlationId: string
}): ProvisioningStepTimelineItem[] => {
  const sorted = [...input.steps].sort((a, b) => a.stepOrder - b.stepOrder)

  return sorted.map((step, index) => {
    const stepId = asString(step.stepId) || `step_${index + 1}`
    const status = toStepStatus(step.status)

    return {
      id: stepId,
      name: resolveStepName(stepId),
      order: Number(step.stepOrder || index + 1),
      status,
      attempt: Math.max(1, Number(step.attempt || 1)),
      startedAt: toIso(step.startedAt),
      completedAt: toIso(step.completedAt),
      errorCode: asString(step.lastErrorCode),
      errorMessage: asString(step.lastErrorMessage),
      remediationAction: asString(step.remediationAction),
      correlationId: asString(step.correlationId) || input.correlationId,
    }
  })
}

const resolveLastError = (input: {
  job: ProvisioningJobRecord
  steps: ProvisioningStepRecord[]
  fallbackOccurredAt: string
}): ProvisioningLastError | null => {
  const failedStep =
    input.steps.find((step) => step.status === 'failed') || null
  const errorCode =
    asString(input.job.lastErrorCode) || asString(failedStep?.lastErrorCode)
  const errorMessage =
    asString(input.job.lastErrorMessage) ||
    asString(failedStep?.lastErrorMessage)

  if (!errorCode && !errorMessage) {
    return null
  }

  return {
    code: errorCode || 'PROVISIONING_FAILED',
    message: errorMessage || 'Provisioning failed.',
    stepId: asString(failedStep?.stepId),
    occurredAt: toIso(input.job.updatedAt) || input.fallbackOccurredAt,
  }
}

const buildProvisioningResponse = async (input: {
  job: ProvisioningJobRecord
  steps: ProvisioningStepRecord[]
  organization: OrganizationRecord
  agent: AgentRecord | null
}): Promise<ProvisioningStatusResponse> => {
  const metadata = parseLifecycleMetadata(input.organization.metadata)
  const rolloutMetadata = parseWizardRollout(metadata)
  const profileVersion =
    asString(input.agent?.promptProfileVersion) || 'legacy_unknown'

  const rollout = resolveRolloutState({
    organization: input.organization,
    rollout: rolloutMetadata,
    profileVersion,
  })

  const status = toJobStatus(input.job.status)
  const correlationId = resolveCorrelationId(asString(input.job.correlationId))
  const updatedAt = toIso(input.job.updatedAt) || nowIso()
  const startedAt =
    toIso(input.job.startedAt) || toIso(input.job.createdAt) || updatedAt
  const completedAt = toIso(input.job.completedAt)

  const retryCount = Math.max(0, Number(input.job.attempt || 1) - 1)
  const retryMetadata = resolveRetryMetadata(input.job.runtimeState)
  const retryEligible =
    RETRY_ELIGIBLE_STATUSES.has(status) &&
    rollout.featureEnabled &&
    !rollout.paused &&
    retryCount < MAX_RETRY_ATTEMPTS &&
    !!input.agent

  const steps = buildStepTimeline({
    steps: input.steps,
    correlationId,
  })

  const response: ProvisioningStatusResponse = {
    jobId: input.job.id,
    organizationId: input.job.organizationId,
    agentId: input.agent?.id || null,
    status,
    readiness: resolveAgentReadiness(input.agent),
    startedAt,
    updatedAt,
    completedAt,
    correlationId,
    lastError: resolveLastError({
      job: input.job,
      steps: input.steps,
      fallbackOccurredAt: updatedAt,
    }),
    retry: {
      eligible: retryEligible,
      retryCount,
      maxRetries: MAX_RETRY_ATTEMPTS,
      lastRetriedAt:
        retryMetadata.lastRetriedAt || (retryCount > 0 ? updatedAt : null),
      lastRetriedByUserId:
        retryMetadata.lastRetriedByUserId ||
        (retryCount > 0 ? asString(input.job.requestedByUserId) : null),
      recommendedAction: buildRecommendedAction({
        status,
        retryCount,
        rollout,
        hasAgent: !!input.agent,
      }),
    },
    rollout,
    links: {
      agentHealth: input.agent ? `/dashboard/agents/${input.agent.id}` : null,
      recentLogs: correlationId
        ? `/dashboard/admin/error-logs?search=${encodeURIComponent(correlationId)}`
        : '/dashboard/admin/error-logs',
    },
    steps,
  }

  recordWizardProvisioningJobMetric(response)

  return response
}

export const getProvisioningStatusByJobId = async (input: {
  jobId: string
  userId: string
  isAdmin: boolean
}): Promise<ProvisioningStatusResponse> => {
  const snapshot = await loadProvisioningSnapshot(input.jobId)

  await assertOrganizationAccess({
    organizationId: snapshot.organization.id,
    userId: input.userId,
    isAdmin: input.isAdmin,
  })

  return buildProvisioningResponse(snapshot)
}

export const getProvisioningStepsByJobId = async (input: {
  jobId: string
  userId: string
  isAdmin: boolean
}): Promise<ProvisioningStepsResponse> => {
  const job = await getProvisioningStatusByJobId(input)
  return {
    jobId: job.jobId,
    status: job.status,
    correlationId: job.correlationId,
    steps: job.steps,
  }
}

export const retryProvisioningJobById = async (input: {
  jobId: string
  userId: string
  isAdmin: boolean
  note?: string
  idempotencyKey?: string
}): Promise<ProvisioningStatusResponse> => {
  const snapshot = await loadProvisioningSnapshot(input.jobId)

  await assertOrganizationAccess({
    organizationId: snapshot.organization.id,
    userId: input.userId,
    isAdmin: input.isAdmin,
    requireRetryRole: true,
  })

  const correlationId = resolveCorrelationId(
    asString(snapshot.job.correlationId),
  )

  try {
    await retryProvisioningOrchestrationJob({
      jobId: snapshot.job.id,
      requestedByUserId: input.userId,
      correlationId,
      idempotencyKey: input.idempotencyKey,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Retry failed'

    if (message.includes('not found')) {
      throw new ProvisioningNotFoundError(
        `Provisioning job ${input.jobId} was not found.`,
      )
    }

    if (message.includes('not retryable')) {
      throw new ProvisioningRetryNotEligibleError(
        'Retry is not eligible for this provisioning job.',
      )
    }

    throw error
  }

  const refreshed = await loadProvisioningSnapshot(input.jobId)
  const response = await buildProvisioningResponse(refreshed)

  logger.info(
    {
      jobId: response.jobId,
      organizationId: response.organizationId,
      agentId: response.agentId,
      retryCount: response.retry.retryCount,
      correlationId: response.correlationId,
      note: input.note || null,
      idempotencyKey: asString(input.idempotencyKey),
    },
    'Manual provisioning retry queued',
  )

  return response
}

export const getLatestProvisioningStatusByAgentId = async (input: {
  agentId: string
  userId: string
  isAdmin: boolean
}): Promise<ProvisioningStatusResponse> => {
  const agent = await getAgentById(input.agentId)
  if (!agent) {
    throw new ProvisioningNotFoundError(
      `Agent ${input.agentId} was not found for provisioning status.`,
    )
  }

  await assertOrganizationAccess({
    organizationId: agent.organizationId,
    userId: input.userId,
    isAdmin: input.isAdmin,
  })

  const latestJob = await findLatestAgentProvisioningJobByAgentId(input.agentId)
  if (!latestJob) {
    throw new ProvisioningNotFoundError(
      `No provisioning job was found for agent ${input.agentId}.`,
    )
  }

  const snapshot = await loadProvisioningSnapshot(latestJob.id)
  return buildProvisioningResponse(snapshot)
}
