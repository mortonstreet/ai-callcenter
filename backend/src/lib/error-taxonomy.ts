import { Request } from 'express'
import { QueueName, QUEUE_NAMES } from '@/types/queues'

export type ErrorTaxonomyTag =
  | 'auth'
  | 'integration'
  | 'campaigns_sms'
  | 'campaigns_voice'
  | 'campaigns_email'
  | 'webhook'
  | 'unknown'

export const resolveTaxonomyFromRequest = (
  req: Pick<Request, 'originalUrl' | 'url'>,
): ErrorTaxonomyTag => {
  const path = (req.originalUrl || req.url || '').toLowerCase()

  if (path.includes('/api/auth')) {
    return 'auth'
  }
  if (path.includes('/integrations')) {
    return 'integration'
  }
  if (path.includes('/sms-campaign') || path.includes('/campaigns/sms')) {
    return 'campaigns_sms'
  }
  if (path.includes('/email-campaign') || path.includes('/campaigns/email')) {
    return 'campaigns_email'
  }
  if (path.includes('/campaign')) {
    return 'campaigns_voice'
  }
  if (path.includes('/webhook')) {
    return 'webhook'
  }

  return 'unknown'
}

export const resolveTaxonomyFromQueue = (
  queueName: QueueName,
): ErrorTaxonomyTag => {
  switch (queueName) {
    case QUEUE_NAMES.INTEGRATION_SYNC:
      return 'integration'
    case QUEUE_NAMES.CAMPAIGN_SMS:
      return 'campaigns_sms'
    case QUEUE_NAMES.CAMPAIGN_EMAIL:
      return 'campaigns_email'
    case QUEUE_NAMES.CAMPAIGN_VOICE:
      return 'campaigns_voice'
    case QUEUE_NAMES.WEBHOOK_INGEST:
      return 'webhook'
    default:
      return 'unknown'
  }
}
