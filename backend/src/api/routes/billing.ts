import { Router } from 'express'
import { withBetterAuth } from '../middlewares/auth'
import { validateAndMerge } from '../middlewares/validationMiddleware'
import { resolveOrganizationScope } from '../middlewares/organizationScope'
import {
  validateMemberOfOrganizationIsOrAdmin,
  validateMemberOfOrganizationOrAdmin,
} from '../middlewares/auth'
import { authenticatedRoute } from './utils'
import {
  CreateCheckoutSessionRequestSchema,
  CreatePortalSessionRequestSchema,
  GetBillingSummaryRequestSchema,
} from '@shared/types/src/requests/billing'
import {
  createCheckoutSessionHandler,
  createPortalSessionHandler,
  getBillingSummaryHandler,
  stripeWebhookHandler,
} from '../controllers/billing.controller'
import { OrganizationRole } from '@shared/types/src'

const router = Router()

router.post('/webhook', stripeWebhookHandler)

router.use(withBetterAuth)

router.get(
  '/summary',
  validateAndMerge(GetBillingSummaryRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(getBillingSummaryHandler),
)

router.post(
  '/checkout-session',
  validateAndMerge(CreateCheckoutSessionRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(createCheckoutSessionHandler),
)

router.post(
  '/portal-session',
  validateAndMerge(CreatePortalSessionRequestSchema),
  resolveOrganizationScope,
  validateMemberOfOrganizationIsOrAdmin([
    OrganizationRole.ADMIN,
    OrganizationRole.OWNER,
  ]),
  authenticatedRoute(createPortalSessionHandler),
)

export default router
