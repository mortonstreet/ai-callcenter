import { randomUUID } from 'crypto'

export type WebhookNamespace = 'integrations' | 'campaigns'

export interface StoredWebhookEvent {
  id: string
  namespace: WebhookNamespace
  organizationId: string | null
  provider: string
  eventId: string
  eventType: string
  payload: Record<string, unknown>
  rawPayload: string
  receivedAt: string
}

interface IngestWebhookEventInput {
  namespace: WebhookNamespace
  organizationId: string | null
  provider: string
  eventId: string
  eventType: string
  payload: Record<string, unknown>
  rawPayload: string
}

const MAX_TRACKED_IDEMPOTENCY_KEYS = 5000
const MAX_AUDIT_EVENTS_PER_NAMESPACE = 500

const idempotencyStore = new Map<string, StoredWebhookEvent>()
const idempotencyOrder: string[] = []
const auditStore: Record<WebhookNamespace, StoredWebhookEvent[]> = {
  integrations: [],
  campaigns: [],
}

const buildIdempotencyKey = (
  namespace: WebhookNamespace,
  provider: string,
  eventId: string,
) => `${namespace}:${provider}:${eventId}`

const pruneStores = () => {
  while (idempotencyOrder.length > MAX_TRACKED_IDEMPOTENCY_KEYS) {
    const key = idempotencyOrder.shift()
    if (key) {
      idempotencyStore.delete(key)
    }
  }

  for (const namespace of ['integrations', 'campaigns'] as const) {
    const current = auditStore[namespace]
    if (current.length > MAX_AUDIT_EVENTS_PER_NAMESPACE) {
      auditStore[namespace] = current.slice(
        current.length - MAX_AUDIT_EVENTS_PER_NAMESPACE,
      )
    }
  }
}

export const ingestWebhookEvent = (
  input: IngestWebhookEventInput,
): { duplicate: boolean; event: StoredWebhookEvent } => {
  const key = buildIdempotencyKey(
    input.namespace,
    input.provider,
    input.eventId,
  )
  const existing = idempotencyStore.get(key)
  if (existing) {
    return {
      duplicate: true,
      event: existing,
    }
  }

  const event: StoredWebhookEvent = {
    id: randomUUID(),
    namespace: input.namespace,
    organizationId: input.organizationId,
    provider: input.provider,
    eventId: input.eventId,
    eventType: input.eventType,
    payload: input.payload,
    rawPayload: input.rawPayload,
    receivedAt: new Date().toISOString(),
  }

  idempotencyStore.set(key, event)
  idempotencyOrder.push(key)
  auditStore[input.namespace].push(event)
  pruneStores()

  return {
    duplicate: false,
    event,
  }
}

export const listRecentWebhookEvents = (
  namespace: WebhookNamespace,
  provider?: string,
  limit: number = 100,
) => {
  const filtered = provider
    ? auditStore[namespace].filter((event) => event.provider === provider)
    : auditStore[namespace]

  return [...filtered]
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
    .slice(0, limit)
}
