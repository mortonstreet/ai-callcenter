import { sendApiError } from '@/api/utils/error-contract'
import { AuthRequestHandler } from '@/types/handlers'
import {
  GetLatestProvisioningJobForAgentRequest,
  GetProvisioningJobRequest,
  GetProvisioningJobStepsRequest,
  RetryProvisioningJobRequest,
} from '@shared/types/src'
import {
  getLatestProvisioningStatusByAgentId,
  getProvisioningStatusByJobId,
  getProvisioningStepsByJobId,
  ProvisioningForbiddenError,
  ProvisioningNotFoundError,
  ProvisioningRetryNotEligibleError,
  retryProvisioningJobById,
} from '@/services/provisioning-status.service'
import { Request } from 'express'

const handleProvisioningError = (
  req: Parameters<AuthRequestHandler<any>>[0],
  res: Parameters<AuthRequestHandler<any>>[1],
  error: unknown,
) => {
  if (error instanceof ProvisioningNotFoundError) {
    return sendApiError(req, res, 404, {
      code: 'PROVISIONING_NOT_FOUND',
      message: error.message,
      userMessage: 'Provisioning status was not found.',
    })
  }
  if (error instanceof ProvisioningForbiddenError) {
    return sendApiError(req, res, 403, {
      code: 'PROVISIONING_FORBIDDEN',
      message: error.message,
      userMessage: 'You do not have access to this provisioning resource.',
    })
  }
  if (error instanceof ProvisioningRetryNotEligibleError) {
    return sendApiError(req, res, 409, {
      code: 'PROVISIONING_RETRY_NOT_ELIGIBLE',
      message: error.message,
      userMessage: 'This provisioning job cannot be retried right now.',
    })
  }
  return sendApiError(req, res, 500, {
    code: 'PROVISIONING_STATUS_FAILED',
    message: 'Failed to resolve provisioning status.',
    userMessage: 'Unable to load provisioning status right now.',
  })
}

const resolveIdempotencyKey = (
  req: Request & { validated?: { idempotencyKey?: string } },
) => {
  const fromPayload = req.validated?.idempotencyKey?.trim()
  if (fromPayload) {
    return fromPayload
  }

  const fromHeader =
    req.get('idempotency-key')?.trim() ||
    req.get('Idempotency-Key')?.trim() ||
    req.get('x-idempotency-key')?.trim()

  return fromHeader || undefined
}

export const getProvisioningJob: AuthRequestHandler<
  GetProvisioningJobRequest
> = async (req, res) => {
  try {
    const data = await getProvisioningStatusByJobId({
      jobId: req.validated.jobId,
      userId: req.user.id,
      isAdmin: req.user.isAdmin,
    })
    return res.json(data)
  } catch (error) {
    return handleProvisioningError(req, res, error)
  }
}

export const getProvisioningJobSteps: AuthRequestHandler<
  GetProvisioningJobStepsRequest
> = async (req, res) => {
  try {
    const data = await getProvisioningStepsByJobId({
      jobId: req.validated.jobId,
      userId: req.user.id,
      isAdmin: req.user.isAdmin,
    })
    return res.json(data)
  } catch (error) {
    return handleProvisioningError(req, res, error)
  }
}

export const retryProvisioningJob: AuthRequestHandler<
  RetryProvisioningJobRequest
> = async (req, res) => {
  try {
    const data = await retryProvisioningJobById({
      jobId: req.validated.jobId,
      userId: req.user.id,
      isAdmin: req.user.isAdmin,
      note: req.validated.note,
      idempotencyKey: resolveIdempotencyKey(req),
    })
    return res.status(202).json(data)
  } catch (error) {
    return handleProvisioningError(req, res, error)
  }
}

export const getLatestProvisioningJobForAgent: AuthRequestHandler<
  GetLatestProvisioningJobForAgentRequest
> = async (req, res) => {
  try {
    const data = await getLatestProvisioningStatusByAgentId({
      agentId: req.validated.agentId,
      userId: req.user.id,
      isAdmin: req.user.isAdmin,
    })
    return res.json(data)
  } catch (error) {
    return handleProvisioningError(req, res, error)
  }
}
