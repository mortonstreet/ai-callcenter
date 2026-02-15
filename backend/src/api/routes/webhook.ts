import { Router } from 'express'
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
