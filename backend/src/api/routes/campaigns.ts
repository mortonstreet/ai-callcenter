import { Router } from 'express'
import {
  withBetterAuth,
  validateMemberOfOrganizationIsOrAdmin,
  validateMemberOfOrganizationOrAdmin,
} from '../middlewares/auth'
import { validateAndMerge } from '../middlewares/validationMiddleware'
import { authenticatedRoute } from './utils'
import { resolveOrganizationScope } from '../middlewares/organizationScope'
import {
  ActivateCampaignRequestSchema,
  CreateCampaignEnrollmentRequestSchema,
  CreateCampaignEnrollmentsFromListRequestSchema,
  CreateCampaignRequestSchema,
  CreateCampaignStepRequestSchema,
  DeleteCampaignEnrollmentRequestSchema,
  DeleteCampaignRequestSchema,
  DeleteCampaignStepRequestSchema,
  GetCampaignEventsRequestSchema,
  GetCampaignRequestSchema,
  GetCampaignStatsRequestSchema,
  ListCampaignEnrollmentsRequestSchema,
  ListCampaignsRequestSchema,
  PauseCampaignRequestSchema,
  UpdateCampaignRequestSchema,
  UpdateCampaignStepRequestSchema,
} from '@shared/types/src/requests/campaigns'
import { OrganizationRole } from '@shared/types/src'
import {
  activateCampaignHandler,
  createCampaignEnrollmentHandler,
  createCampaignEnrollmentsFromListHandler,
  createCampaignHandler,
  createCampaignStepHandler,
  deleteCampaignEnrollmentHandler,
  deleteCampaignHandler,
  deleteCampaignStepHandler,
  getCampaignEventsHandler,
  getCampaignHandler,
  getCampaignStatsHandler,
  listCampaignEnrollmentsHandler,
  listCampaignsHandler,
  pauseCampaignHandler,
  updateCampaignHandler,
  updateCampaignStepHandler,
} from '../controllers/campaign.controller'

const router = Router()

router.use(withBetterAuth)

router.get(
  '/',
  validateAndMerge(ListCampaignsRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(listCampaignsHandler),
)

router.post(
  '/',
  validateAndMerge(CreateCampaignRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(createCampaignHandler),
)

router.get(
  '/:id',
  validateAndMerge(GetCampaignRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(getCampaignHandler),
)

router.patch(
  '/:id',
  validateAndMerge(UpdateCampaignRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(updateCampaignHandler),
)

router.delete(
  '/:id',
  validateAndMerge(DeleteCampaignRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(deleteCampaignHandler),
)

router.post(
  '/:id/activate',
  validateAndMerge(ActivateCampaignRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(activateCampaignHandler),
)

router.post(
  '/:id/pause',
  validateAndMerge(PauseCampaignRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(pauseCampaignHandler),
)

router.post(
  '/:id/steps',
  validateAndMerge(CreateCampaignStepRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(createCampaignStepHandler),
)

router.patch(
  '/:id/steps/:stepId',
  validateAndMerge(UpdateCampaignStepRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(updateCampaignStepHandler),
)

router.delete(
  '/:id/steps/:stepId',
  validateAndMerge(DeleteCampaignStepRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(deleteCampaignStepHandler),
)

router.get(
  '/:id/enrollments',
  validateAndMerge(ListCampaignEnrollmentsRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(listCampaignEnrollmentsHandler),
)

router.post(
  '/:id/enrollments',
  validateAndMerge(CreateCampaignEnrollmentRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(createCampaignEnrollmentHandler),
)

router.post(
  '/:id/enrollments/from-list',
  validateAndMerge(CreateCampaignEnrollmentsFromListRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(createCampaignEnrollmentsFromListHandler),
)

router.delete(
  '/:id/enrollments/:enrollmentId',
  validateAndMerge(DeleteCampaignEnrollmentRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(deleteCampaignEnrollmentHandler),
)

router.get(
  '/:id/stats',
  validateAndMerge(GetCampaignStatsRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(getCampaignStatsHandler),
)

router.get(
  '/:id/events',
  validateAndMerge(GetCampaignEventsRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(getCampaignEventsHandler),
)

export default router
