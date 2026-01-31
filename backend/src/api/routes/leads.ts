import { Router } from 'express'
import {
  withBetterAuth,
  validateMemberOfOrganizationOrAdmin,
} from '../middlewares/auth'
import { validateAndMerge } from '../middlewares/validationMiddleware'
import { authenticatedRoute } from './utils'
import {
  listLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
} from '../controllers/lead.controller'
import {
  ListLeadsRequestSchema,
  GetLeadRequestSchema,
  CreateLeadRequestSchema,
  UpdateLeadRequestSchema,
  DeleteLeadRequestSchema,
} from '@shared/types/src'

const router = Router()

router.get(
  '/:organizationId',
  withBetterAuth,
  validateAndMerge(ListLeadsRequestSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(listLeads),
)

router.get(
  '/:organizationId/:id',
  withBetterAuth,
  validateAndMerge(GetLeadRequestSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(getLead),
)

router.post(
  '/:organizationId',
  withBetterAuth,
  validateAndMerge(CreateLeadRequestSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(createLead),
)

router.patch(
  '/:organizationId/:id',
  withBetterAuth,
  validateAndMerge(UpdateLeadRequestSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(updateLead),
)

router.delete(
  '/:organizationId/:id',
  withBetterAuth,
  validateAndMerge(DeleteLeadRequestSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(deleteLead),
)

export default router
