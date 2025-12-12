import { Router } from 'express'
import { withBetterAuth } from '../middlewares/auth'
import { adminOnlyRoute } from './utils'
import {
  getAdminStats,
  getAdminUsers,
  getAdminOrganizations,
  createOrganization,
  createAgent,
  updateOrganizationLogo,
  deleteOrganization,
} from '@/api/controllers/admin.controller'
import { z } from 'zod'
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

// Update organization logo
const UpdateOrganizationLogoSchema = z.object({
  organizationId: z.string(),
  logo: z.string(), // URL or base64 data
})

router.patch(
  '/organizations/:organizationId/logo',
  withBetterAuth,
  validateAndMerge(UpdateOrganizationLogoSchema),
  adminOnlyRoute<{ organizationId: string; logo: string }>(
    updateOrganizationLogo,
  ),
)

// Delete organization
const DeleteOrganizationSchema = z.object({
  organizationId: z.string(),
})

router.delete(
  '/organizations/:organizationId',
  withBetterAuth,
  validateAndMerge(DeleteOrganizationSchema),
  adminOnlyRoute<{ organizationId: string }>(deleteOrganization),
)

export default router
