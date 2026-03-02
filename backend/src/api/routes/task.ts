import { Router } from 'express'
import { z } from 'zod'
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
  updateTaskInstancePipelineHandler,
  getRecordingsHandler,
  getRecordingDetailHandler,
  syncRecordingsHandler,
  exportLeadsHandler,
  updateRecordingQualityHandler,
} from '../controllers/task.controller'
import { authenticatedRoute } from './utils'

const router = Router()

// Pipeline stage update schema - flat structure for validateAndMerge
// Flow: New → Follow Up → Booked → Dispatched → Closed Won/Lost
const UpdatePipelineStageSchema = z.object({
  organizationId: z.string(),
  id: z.string(),
  pipelineStage: z.enum([
    'new',
    'follow_up',
    'booked',
    'dispatched',
    'closed_won',
    'closed_lost',
  ]),
})

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

router.post(
  '/:organizationId/instances/:id/pipeline',
  withBetterAuth,
  validateAndMerge(UpdatePipelineStageSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(updateTaskInstancePipelineHandler),
)

router.get(
  '/:organizationId/recordings',
  withBetterAuth,
  validateAndMerge(GetRecordingsRequestSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(getRecordingsHandler),
)

// Single recording detail with joined lead
const GetRecordingDetailRequestSchema = z.object({
  organizationId: z.string(),
  recordingId: z.string(),
})

router.get(
  '/:organizationId/recordings/:recordingId',
  withBetterAuth,
  validateAndMerge(GetRecordingDetailRequestSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(getRecordingDetailHandler),
)

// Sync recordings from ElevenLabs API
// This pulls new conversation data directly from ElevenLabs
const SyncRecordingsRequestSchema = z.object({
  organizationId: z.string(),
})

router.post(
  '/:organizationId/recordings/sync',
  withBetterAuth,
  validateAndMerge(SyncRecordingsRequestSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(syncRecordingsHandler),
)

// Update recording quality (manual override)
const UpdateRecordingQualitySchema = z.object({
  organizationId: z.string(),
  recordingId: z.string(),
  callQuality: z.enum([
    'productive',
    'short_call',
    'no_conversation',
    'robocall',
    'spam',
  ]),
})

router.post(
  '/:organizationId/recordings/:recordingId/quality',
  withBetterAuth,
  validateAndMerge(UpdateRecordingQualitySchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(updateRecordingQualityHandler),
)

// Export leads to CSV
const ExportLeadsRequestSchema = z.object({
  organizationId: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  fields: z.string().optional(), // comma-separated list: name,phone,email,etc.
})

router.get(
  '/:organizationId/export',
  withBetterAuth,
  validateAndMerge(ExportLeadsRequestSchema),
  validateMemberOfOrganizationOrAdmin,
  authenticatedRoute(exportLeadsHandler),
)

export default router
