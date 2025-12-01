import { Router } from 'express'
import { withBetterAuth } from '../middlewares/auth'
import { adminOnlyRoute } from './utils'
import {
  getAdminStats,
  getAdminUsers,
  getAdminOrganizations,
  createOrganization,
  createAgent,
} from '@/api/controllers/admin.controller'
import { validateAndMerge } from '@/api/middlewares/validationMiddleware'
import {
  AdminCreateOrganizationRequest,
  AdminCreateOrganizationRequestSchema,
  AdminCreateAgentRequest,
  AdminCreateAgentRequestSchema,
} from '@shared/types/src'

const router = Router()

router.get('/stats', withBetterAuth, adminOnlyRoute<{}>(getAdminStats))
router.get('/users', withBetterAuth, adminOnlyRoute<{}>(getAdminUsers))
router.get(
  '/organizations',
  withBetterAuth,
  adminOnlyRoute<{}>(getAdminOrganizations),
)
router.post(
  '/organizations',
  withBetterAuth,
  validateAndMerge(AdminCreateOrganizationRequestSchema),
  adminOnlyRoute<AdminCreateOrganizationRequest>(createOrganization),
)
router.post(
  '/agents',
  withBetterAuth,
  validateAndMerge(AdminCreateAgentRequestSchema),
  adminOnlyRoute<AdminCreateAgentRequest>(createAgent),
)

export default router
