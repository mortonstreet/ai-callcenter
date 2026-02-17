import { Router } from 'express'
import { withBetterAuth } from '../middlewares/auth'
import { validateAndMerge } from '@/api/middlewares/validationMiddleware'
import { z } from 'zod'
import {
  deleteOrganizationDev,
  onboardOrganization,
  OrganizationOnboardingSchema,
} from '@/api/controllers/organization.controller'
import { authenticatedRoute } from './utils'
import { rejectForbiddenWizardFields } from '../middlewares/wizardContract'

const router = Router()

const DeleteOrganizationSchema = z.object({
  organizationId: z.string(),
})

router.post(
  '/onboarding',
  withBetterAuth,
  rejectForbiddenWizardFields,
  validateAndMerge(OrganizationOnboardingSchema),
  authenticatedRoute(onboardOrganization),
)

router.delete(
  '/:organizationId',
  withBetterAuth,
  validateAndMerge(DeleteOrganizationSchema),
  authenticatedRoute(deleteOrganizationDev),
)

export default router
