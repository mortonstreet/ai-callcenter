import { Router } from 'express'
import { withElevenLabsWebhookAuth } from '../middlewares/auth'
import { ElevenLabsWebhookSchema } from '@shared/types/src'
import { agentWebhook } from '../controllers/agent.controller'
import { validateAndMerge } from '../middlewares/validationMiddleware'
import { validatedRoute } from './utils'
import express from 'express'

const router = Router()

router.post(
  '/agent/elevenlabs',
  express.raw({ type: 'application/json' }),
  withElevenLabsWebhookAuth,
  validateAndMerge(ElevenLabsWebhookSchema),
  validatedRoute(agentWebhook),
)
export default router
