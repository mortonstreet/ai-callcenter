export const QUEUE_NAMES = {
  CAMPAIGN_VOICE: 'campaign_voice',
  CAMPAIGN_SMS: 'campaign_sms',
  CAMPAIGN_EMAIL: 'campaign_email',
  INTEGRATION_SYNC: 'integration_sync',
  WEBHOOK_INGEST: 'webhook_ingest',
  ONBOARDING_PROVISIONING: 'onboarding_provisioning',
} as const

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]

export const ALL_QUEUE_NAMES: QueueName[] = Object.values(QUEUE_NAMES)

export const DEAD_LETTER_QUEUE_SUFFIX = 'dlq'

export interface QueueJobPayload {
  organizationId?: string
  idempotencyKey?: string
  [key: string]: unknown
}
