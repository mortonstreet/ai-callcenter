import { ValidatedRequestHandler } from '@/types/handlers'
import {
  CampaignWebhookIngestRequest,
  IntegrationWebhookIngestRequest,
} from '@shared/types/src/requests/webhooks'
import { ingestWebhookEvent } from '@/services/webhook-event.service'
import logger from '@/lib/logger'

interface RequestWithRawPayload {
  rawBodyText?: string
}

export const ingestIntegrationWebhookHandler: ValidatedRequestHandler<
  IntegrationWebhookIngestRequest
> = async (req, res) => {
  const { organizationId, provider, eventId, eventType, payload } =
    req.validated
  const requestWithRaw = req as typeof req & RequestWithRawPayload

  const result = ingestWebhookEvent({
    namespace: 'integrations',
    organizationId: organizationId || null,
    provider,
    eventId,
    eventType,
    payload,
    rawPayload: requestWithRaw.rawBodyText || JSON.stringify(payload),
  })

  logger.info(
    {
      namespace: 'integrations',
      provider,
      eventId,
      duplicate: result.duplicate,
      organizationId: organizationId || null,
    },
    'Integration webhook ingested',
  )

  return res.status(202).json({
    accepted: true,
    duplicate: result.duplicate,
    event: {
      id: result.event.id,
      eventId: result.event.eventId,
      eventType: result.event.eventType,
      receivedAt: result.event.receivedAt,
    },
  })
}

export const ingestCampaignWebhookHandler: ValidatedRequestHandler<
  CampaignWebhookIngestRequest
> = async (req, res) => {
  const { organizationId, provider, eventId, eventType, payload, campaignId } =
    req.validated
  const requestWithRaw = req as typeof req & RequestWithRawPayload

  const result = ingestWebhookEvent({
    namespace: 'campaigns',
    organizationId: organizationId || null,
    provider,
    eventId,
    eventType,
    payload: {
      ...payload,
      ...(campaignId ? { campaignId } : {}),
    },
    rawPayload: requestWithRaw.rawBodyText || JSON.stringify(payload),
  })

  logger.info(
    {
      namespace: 'campaigns',
      provider,
      eventId,
      duplicate: result.duplicate,
      organizationId: organizationId || null,
      campaignId: campaignId || null,
    },
    'Campaign webhook ingested',
  )

  return res.status(202).json({
    accepted: true,
    duplicate: result.duplicate,
    event: {
      id: result.event.id,
      eventId: result.event.eventId,
      eventType: result.event.eventType,
      receivedAt: result.event.receivedAt,
    },
  })
}
