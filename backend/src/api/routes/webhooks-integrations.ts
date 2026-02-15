import { Router } from 'express'
import express from 'express'
import {
  parseSignedWebhookBody,
  verifySignedWebhook,
} from '../middlewares/webhookContracts'
import { validateAndMerge } from '../middlewares/validationMiddleware'
import { IntegrationWebhookIngestRequestSchema } from '@shared/types/src/requests/webhooks'
import { validatedRoute } from './utils'
import { ingestIntegrationWebhookHandler } from '../controllers/webhook-contract.controller'

const router = Router()

router.post(
  '/:provider',
  express.raw({ type: 'application/json', limit: '10mb' }),
  parseSignedWebhookBody,
  verifySignedWebhook,
  validateAndMerge(IntegrationWebhookIngestRequestSchema),
  validatedRoute(ingestIntegrationWebhookHandler),
)

export default router
