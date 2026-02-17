import { Router } from 'express'
import { validateAndMerge } from '@/api/middlewares/validationMiddleware'
import {
  GetLatestProvisioningJobForAgentSchema,
  GetProvisioningJobSchema,
  GetProvisioningJobStepsSchema,
  RetryProvisioningJobSchema,
} from '@shared/types/src'
import { authenticatedRoute } from './utils'
import { withBetterAuth } from '../middlewares/auth'
import {
  getLatestProvisioningJobForAgent,
  getProvisioningJob,
  getProvisioningJobSteps,
  retryProvisioningJob,
} from '@/api/controllers/provisioning.controller'

const router = Router()

router.use(withBetterAuth)

router.get(
  '/agent/:agentId/latest',
  validateAndMerge(GetLatestProvisioningJobForAgentSchema),
  authenticatedRoute(getLatestProvisioningJobForAgent),
)

router.get(
  '/:jobId',
  validateAndMerge(GetProvisioningJobSchema),
  authenticatedRoute(getProvisioningJob),
)

router.get(
  '/:jobId/steps',
  validateAndMerge(GetProvisioningJobStepsSchema),
  authenticatedRoute(getProvisioningJobSteps),
)

router.post(
  '/:jobId/retry',
  validateAndMerge(RetryProvisioningJobSchema),
  authenticatedRoute(retryProvisioningJob),
)

export default router
