import { Router } from 'express'
import { createHash } from 'crypto'
import {
  withApiKeyAuth,
  withWebhookAuth,
  withElevenLabsWebhookAuth,
} from '../middlewares/auth'
import { ElevenLabsWebhookSchema } from '@shared/types/src'
import { agentWebhook, calcomWebhook } from '../controllers/agent.controller'
import { validateAndMerge } from '../middlewares/validationMiddleware'
import { validatedRoute } from './utils'
import express from 'express'
import logger from '@/lib/logger'
import { z } from 'zod'
import { addSuppression } from '@/services/compliance.service'
import {
  IntegrationServiceError,
  startSyncJob,
} from '@/services/integration-contract.service'
import { ingestWebhookEvent } from '@/services/webhook-event.service'
import {
  parseSignedWebhookBody,
  verifySignedWebhook,
} from '../middlewares/webhookContracts'
import { sendApiError } from '../utils/error-contract'

const router = Router()

// Webhook logging middleware
const logWebhook =
  (providerSlug: string) => (req: any, res: any, next: any) => {
    logger.info(`📥 WEBHOOK RECEIVED [${providerSlug}]`, {
      headers: req.headers,
      bodyType: typeof req.body,
      bodyLength: req.body?.length || 0,
    })
    next()
  }

const logAuthPassed =
  (providerSlug: string) => (req: any, res: any, next: any) => {
    logger.info(`✅ WEBHOOK AUTH PASSED [${providerSlug}]`)
    next()
  }

const GoogleCalendarWebhookSchema = z.object({
  organizationId: z.string().min(1),
  eventId: z.string().min(1),
  eventType: z.string().min(1),
  cursor: z.string().optional(),
  payload: z.record(z.string(), z.any()).default({}),
})

// Legacy route - ElevenLabs specific
router.post(
  '/agent/elevenlabs',
  logWebhook('elevenlabs'),
  express.raw({ type: 'application/json', limit: '10mb' }),
  withElevenLabsWebhookAuth,
  logAuthPassed('elevenlabs'),
  validateAndMerge(ElevenLabsWebhookSchema),
  validatedRoute(agentWebhook),
)

// Dynamic webhook route for any provider: /webhook/agent/:providerSlug
router.post(
  '/agent/:providerSlug',
  (req, res, next) => {
    const { providerSlug } = req.params
    logWebhook(providerSlug)(req, res, next)
  },
  express.raw({ type: 'application/json', limit: '10mb' }),
  withWebhookAuth, // Dynamic auth that looks up provider by slug
  (req, res, next) => {
    const { providerSlug } = req.params
    logAuthPassed(providerSlug)(req, res, next)
  },
  validateAndMerge(ElevenLabsWebhookSchema), // Can be made dynamic per provider if needed
  validatedRoute(agentWebhook),
)

// Cal.com webhook for booking events (cancellations, reschedules, etc.)
// Configure this URL in Cal.com: https://your-domain.com/api/webhook/calcom
router.post(
  '/calcom',
  logWebhook('calcom'),
  withApiKeyAuth,
  express.json(),
  async (req, res) => {
    try {
      await calcomWebhook(req, res)
    } catch (error) {
      logger.error('Cal.com webhook error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  },
)

router.post(
  '/google-calendar',
  logWebhook('google-calendar'),
  express.raw({ type: 'application/json', limit: '10mb' }),
  parseSignedWebhookBody,
  verifySignedWebhook,
  async (req, res) => {
    const rawPayload =
      typeof (req as { rawBodyText?: string }).rawBodyText === 'string'
        ? (req as { rawBodyText?: string }).rawBodyText || ''
        : ''

    const parsed = GoogleCalendarWebhookSchema.safeParse(req.body)
    if (!parsed.success) {
      const payloadHash = createHash('sha256')
        .update(rawPayload || JSON.stringify(req.body || {}), 'utf8')
        .digest('hex')
      const eventId = `invalid:${payloadHash.slice(0, 24)}`

      ingestWebhookEvent({
        namespace: 'integrations',
        organizationId: null,
        provider: 'google-calendar',
        eventId,
        eventType: 'invalid_payload',
        payload: {
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            code: issue.code,
            message: issue.message,
          })),
        },
        rawPayload: rawPayload || JSON.stringify(req.body || {}),
      })

      logger.warn(
        {
          issues: parsed.error.issues,
        },
        'Rejected invalid Google Calendar webhook payload',
      )

      return sendApiError(req, res, 400, {
        code: 'GOOGLE_CALENDAR_WEBHOOK_INVALID_PAYLOAD',
        message: 'Invalid Google Calendar webhook payload',
        userMessage: 'Webhook payload is invalid.',
      })
    }

    const { organizationId, eventId, eventType, cursor, payload } = parsed.data
    const ingestResult = ingestWebhookEvent({
      namespace: 'integrations',
      organizationId,
      provider: 'google-calendar',
      eventId,
      eventType,
      payload: {
        ...payload,
        ...(cursor ? { cursor } : {}),
      },
      rawPayload: rawPayload || JSON.stringify(parsed.data),
    })

    if (ingestResult.duplicate) {
      return res.status(202).json({
        accepted: true,
        duplicate: true,
        event: {
          id: ingestResult.event.id,
          eventId,
          eventType,
          receivedAt: ingestResult.event.receivedAt,
        },
      })
    }

    try {
      const syncJob = await startSyncJob(
        organizationId,
        'google-calendar',
        'pull',
      )

      return res.status(202).json({
        accepted: true,
        duplicate: false,
        event: {
          id: ingestResult.event.id,
          eventId,
          eventType,
          receivedAt: ingestResult.event.receivedAt,
        },
        syncJobId: syncJob.id,
      })
    } catch (error) {
      if (error instanceof IntegrationServiceError) {
        return sendApiError(req, res, error.status, {
          code: error.code,
          message: error.message,
          userMessage: error.userMessage,
          details: error.details,
        })
      }
      throw error
    }
  },
)

const SmsUnsubscribeSchema = z.object({
  organizationId: z.string(),
  phone: z.string().min(1),
  reason: z.string().optional(),
})

router.post(
  '/sms/unsubscribe',
  withApiKeyAuth,
  express.json(),
  validateAndMerge(SmsUnsubscribeSchema),
  async (req, res) => {
    const { organizationId, phone, reason } = req.validated as {
      organizationId: string
      phone: string
      reason?: string
    }

    const entry = addSuppression({
      organizationId,
      phone,
      reason: reason || 'sms_unsubscribe',
    })

    if (!entry) {
      return res.status(400).json({
        error: 'SUPPRESSION_INPUT_INVALID',
        message: 'Valid phone number required for unsubscribe',
      })
    }

    logger.info(
      {
        organizationId,
        phone: entry.value,
        reason: entry.reason,
      },
      'SMS contact added to global suppression list',
    )

    return res.status(202).json({
      accepted: true,
      data: entry,
    })
  },
)

export default router
