import { Router } from 'express'
import {
  withBetterAuth,
  validateMemberOfOrganizationOrAdmin,
} from '../middlewares/auth'
import { validateAndMerge } from '../middlewares/validationMiddleware'
import {
  GetTaskInstancesRequestSchema,
  GetTaskInstanceRequestSchema,
  UpdateTaskInstanceStatusRequestSchema,
  GetRecordingsRequestSchema,
} from '@shared/types/src'
import {
  getTaskInstancesHandler,
  getTaskInstanceHandler,
  updateTaskInstanceStatusHandler,
  getRecordingsHandler,
} from '../controllers/task.controller'
import { authenticatedRoute } from './utils'

const router = Router()

router.get(
  '/:organizationId/instances',
  withBetterAuth,
  validateAndMerge(GetTaskInstancesRequestSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(getTaskInstancesHandler),
)

router.get(
  '/:organizationId/instances/:id',
  withBetterAuth,
  validateAndMerge(GetTaskInstanceRequestSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(getTaskInstanceHandler),
)

router.post(
  '/:organizationId/instances/:id/status',
  withBetterAuth,
  validateAndMerge(UpdateTaskInstanceStatusRequestSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(updateTaskInstanceStatusHandler),
)

router.get(
  '/:organizationId/recordings',
  withBetterAuth,
  validateAndMerge(GetRecordingsRequestSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(getRecordingsHandler),
)

export default router
