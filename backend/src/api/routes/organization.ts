import { Router } from 'express'
import { withBetterAuth } from '../middlewares/auth'
import { validateAndMerge } from '@/api/middlewares/validationMiddleware'
import { z } from 'zod'
import {
  deleteOrganizationDev,
  getOrganizationOnboardingProvisioningStatus,
  onboardOrganization,
  OrganizationProvisioningRetrySchema,
  OrganizationProvisioningStatusSchema,
  OrganizationOnboardingSchema,
  retryOrganizationOnboardingProvisioning,
} from '@/api/controllers/organization.controller'
import { authenticatedRoute } from './utils'

const router = Router()

const DeleteOrganizationSchema = z.object({
  organizationId: z.string(),
})

router.post(
  '/onboarding',
  withBetterAuth,
  validateAndMerge(OrganizationOnboardingSchema),
  authenticatedRoute(onboardOrganization),
)

router.get(
  '/onboarding/provisioning-status',
  withBetterAuth,
  validateAndMerge(OrganizationProvisioningStatusSchema),
  authenticatedRoute(getOrganizationOnboardingProvisioningStatus),
)

router.post(
  '/onboarding/provisioning/retry',
  withBetterAuth,
  validateAndMerge(OrganizationProvisioningRetrySchema),
  authenticatedRoute(retryOrganizationOnboardingProvisioning),
)

router.delete(
  '/:organizationId',
  withBetterAuth,
  validateAndMerge(DeleteOrganizationSchema),
  authenticatedRoute(deleteOrganizationDev),
)

export default router
