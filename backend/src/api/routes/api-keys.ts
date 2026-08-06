import { Router } from 'express'
import {
  CreateApiKeyRequestSchema,
  ListApiKeysRequestSchema,
  RevokeApiKeyRequestSchema,
} from '@shared/types/src'
import { validateAndMerge } from '@/api/middlewares/validationMiddleware'
import {
  validateIsAdmin,
  withBetterAuthSessionOnly,
} from '@/api/middlewares/auth'
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from '@/api/controllers/api-key.controller'
import { authenticatedRoute } from './utils'

const router = Router()

router.use(withBetterAuthSessionOnly)

router.get(
  '/:organizationId',
  validateAndMerge(ListApiKeysRequestSchema),
  validateIsAdmin,
  authenticatedRoute(listApiKeys),
)

router.post(
  '/:organizationId',
  validateAndMerge(CreateApiKeyRequestSchema),
  validateIsAdmin,
  authenticatedRoute(createApiKey),
)

router.delete(
  '/:organizationId/:id',
  validateAndMerge(RevokeApiKeyRequestSchema),
  validateIsAdmin,
  authenticatedRoute(revokeApiKey),
)

export default router
