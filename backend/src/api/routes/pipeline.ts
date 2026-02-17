import { Router } from 'express'
import {
  withBetterAuth,
  validateMemberOfOrganizationOrAdmin,
} from '../middlewares/auth'
import { validateAndMerge } from '../middlewares/validationMiddleware'
import { authenticatedRoute } from './utils'
import {
  getPipelineStagesHandler,
  createPipelineStageHandler,
  updatePipelineStageHandler,
  deletePipelineStageHandler,
  reorderPipelineStagesHandler,
  moveLeadToPipelineStageHandler,
} from '../controllers/pipeline.controller'
import {
  GetPipelineStagesRequestSchema,
  CreatePipelineStageRequestSchema,
  UpdatePipelineStageRequestSchema,
  DeletePipelineStageRequestSchema,
  ReorderPipelineStagesRequestSchema,
  MoveLeadToPipelineStageRequestSchema,
} from '@shared/types/src'

const router = Router()

router.get(
  '/:organizationId/stages',
  withBetterAuth,
  validateAndMerge(GetPipelineStagesRequestSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(getPipelineStagesHandler),
)

router.post(
  '/:organizationId/stages',
  withBetterAuth,
  validateAndMerge(CreatePipelineStageRequestSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(createPipelineStageHandler),
)

router.post(
  '/:organizationId/stages/reorder',
  withBetterAuth,
  validateAndMerge(ReorderPipelineStagesRequestSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(reorderPipelineStagesHandler),
)

router.patch(
  '/:organizationId/stages/:id',
  withBetterAuth,
  validateAndMerge(UpdatePipelineStageRequestSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(updatePipelineStageHandler),
)

router.delete(
  '/:organizationId/stages/:id',
  withBetterAuth,
  validateAndMerge(DeletePipelineStageRequestSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(deletePipelineStageHandler),
)

router.post(
  '/:organizationId/leads/:id/move',
  withBetterAuth,
  validateAndMerge(MoveLeadToPipelineStageRequestSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(moveLeadToPipelineStageHandler),
)

export default router
