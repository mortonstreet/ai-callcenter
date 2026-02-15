import { Router } from 'express'
import express from 'express'
import {
  parseSignedWebhookBody,
  verifySignedWebhook,
} from '../middlewares/webhookContracts'
import { validateAndMerge } from '../middlewares/validationMiddleware'
import { CampaignWebhookIngestRequestSchema } from '@shared/types/src/requests/webhooks'
import { validatedRoute } from './utils'
import { ingestCampaignWebhookHandler } from '../controllers/webhook-contract.controller'

const router = Router()

router.post(
  '/:provider',
  express.raw({ type: 'application/json', limit: '10mb' }),
  parseSignedWebhookBody,
  verifySignedWebhook,
  validateAndMerge(CampaignWebhookIngestRequestSchema),
  validatedRoute(ingestCampaignWebhookHandler),
)

export default router
