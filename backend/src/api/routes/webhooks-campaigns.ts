import { Router } from 'express'
import express from 'express'
import { randomUUID } from 'crypto'
import {
  parseSignedWebhookBody,
  verifySignedWebhook,
} from '../middlewares/webhookContracts'
import { validateAndMerge } from '../middlewares/validationMiddleware'
import { CampaignWebhookIngestRequestSchema } from '@shared/types/src/requests/webhooks'
import { validatedRoute } from './utils'
import { ingestCampaignWebhookHandler } from '../controllers/webhook-contract.controller'

const router = Router()

const extractEventId = (body: Record<string, unknown>): string => {
  const candidates = [
    body.eventId,
    body.id,
    body.messageId,
    body.providerMessageId,
    body.MessageSid,
    body.SmsSid,
    body.CallSid,
    body.sg_event_id,
    body.event_id,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate
    }
  }

  return randomUUID()
}

const mapChannelWebhook =
  (provider: string, eventType: string) =>
  (
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    const parsed =
      req.body && typeof req.body === 'object'
        ? (req.body as Record<string, unknown>)
        : {}

    req.body = {
      ...parsed,
      provider: parsed.provider || provider,
      eventType: parsed.eventType || eventType,
      eventId:
        (typeof parsed.eventId === 'string' && parsed.eventId) ||
        extractEventId(parsed),
      payload:
        parsed.payload && typeof parsed.payload === 'object'
          ? parsed.payload
          : parsed,
    }

    next()
  }

router.post(
  '/sms-status',
  express.raw({ type: 'application/json', limit: '10mb' }),
  parseSignedWebhookBody,
  verifySignedWebhook,
  mapChannelWebhook('twilio', 'sms.status'),
  validateAndMerge(CampaignWebhookIngestRequestSchema),
  validatedRoute(ingestCampaignWebhookHandler),
)

router.post(
  '/sms-inbound',
  express.raw({ type: 'application/json', limit: '10mb' }),
  parseSignedWebhookBody,
  verifySignedWebhook,
  mapChannelWebhook('twilio', 'sms.inbound'),
  validateAndMerge(CampaignWebhookIngestRequestSchema),
  validatedRoute(ingestCampaignWebhookHandler),
)

router.post(
  '/email-events',
  express.raw({ type: 'application/json', limit: '10mb' }),
  parseSignedWebhookBody,
  verifySignedWebhook,
  mapChannelWebhook('email', 'email.event'),
  validateAndMerge(CampaignWebhookIngestRequestSchema),
  validatedRoute(ingestCampaignWebhookHandler),
)

router.post(
  '/voice-events',
  express.raw({ type: 'application/json', limit: '10mb' }),
  parseSignedWebhookBody,
  verifySignedWebhook,
  mapChannelWebhook('twilio', 'voice.event'),
  validateAndMerge(CampaignWebhookIngestRequestSchema),
  validatedRoute(ingestCampaignWebhookHandler),
)

router.post(
  '/:provider',
  express.raw({ type: 'application/json', limit: '10mb' }),
  parseSignedWebhookBody,
  verifySignedWebhook,
  validateAndMerge(CampaignWebhookIngestRequestSchema),
  validatedRoute(ingestCampaignWebhookHandler),
)

export default router
