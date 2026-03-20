import { AuthRequestHandler } from '@/types/handlers'
import { config } from '@/config'
import { db } from '@/lib/db'
import { WizardInputV2Schema } from '@shared/types/src'
import { z } from 'zod'
import { startOnboardingProvisioning } from '@/services/provisioning-orchestrator.service'
import { getCorrelationId, sendApiError } from '@/api/utils/error-contract'
import { findMember } from '@/repositories/organization.repository'
import {
  getProvisioningStatusByJobId,
  ProvisioningForbiddenError,
  ProvisioningNotFoundError,
  ProvisioningRetryNotEligibleError,
  retryProvisioningJobById,
} from '@/services/provisioning-status.service'

export const OrganizationOnboardingSchema = z
  .object({
    name: z.string().trim().min(1),
    domain: z.string().trim().optional(),
    idempotencyKey: z.string().trim().min(1).max(256).optional(),
    wizard_input_v2: WizardInputV2Schema,
  })
  .strict()

type OrgOnboardingRequest = z.infer<typeof OrganizationOnboardingSchema>

export const OnboardingProvisioningStatusSchema = z
  .object({
    organizationId: z.string().trim().min(1).optional(),
  })
  .strict()

export const RetryOnboardingProvisioningSchema = z
  .object({
    organizationId: z.string().trim().min(1).optional(),
    idempotencyKey: z.string().trim().min(1).max(256).optional(),
  })
  .strict()

type OnboardingProvisioningStatusRequest = z.infer<
  typeof OnboardingProvisioningStatusSchema
>
type RetryOnboardingProvisioningRequest = z.infer<
  typeof RetryOnboardingProvisioningSchema
>

const resolveWizardInputFromOnboarding = (
  payload: OrgOnboardingRequest,
): z.infer<typeof WizardInputV2Schema> => {
  return payload.wizard_input_v2
}

const resolveIdempotencyKey = (req: {
  validated: { idempotencyKey?: string }
  get: (key: string) => string | undefined
}) => {
  const fromPayload = req.validated.idempotencyKey?.trim()
  if (fromPayload) {
    return fromPayload
  }

  const fromHeader =
    req.get('idempotency-key') ||
    req.get('Idempotency-Key') ||
    req.get('x-idempotency-key')

  return fromHeader?.trim()
}

const canRetryByRole = (role?: string | null): boolean =>
  role === 'owner' || role === 'admin'

const resolveOrganizationForUser = async (input: {
  userId: string
  organizationId?: string
}) => {
  let resolvedOrganizationId = input.organizationId?.trim() || undefined

  if (!resolvedOrganizationId) {
    const user = await db
      .selectFrom('user')
      .where('id', '=', input.userId)
      .select('lastActiveOrganizationId')
      .executeTakeFirst()
    resolvedOrganizationId = user?.lastActiveOrganizationId || undefined
  }

  if (!resolvedOrganizationId) {
    const fallbackMembership = await db
      .selectFrom('member')
      .innerJoin('organization', 'organization.id', 'member.organizationId')
      .where('member.userId', '=', input.userId)
      .orderBy('organization.createdAt', 'desc')
      .select(['member.organizationId'])
      .executeTakeFirst()

    resolvedOrganizationId = fallbackMembership?.organizationId
  }

  if (!resolvedOrganizationId) {
    return {
      error: {
        status: 404,
        code: 'ONBOARDING_ORGANIZATION_NOT_FOUND',
        message: 'No onboarding organization found for this account.',
      },
    } as const
  }

  const member = await findMember(resolvedOrganizationId, input.userId)
  if (!member) {
    return {
      error: {
        status: 403,
        code: 'ONBOARDING_ORGANIZATION_FORBIDDEN',
        message: 'You do not have access to this organization.',
      },
    } as const
  }

  const organization = await db
    .selectFrom('organization')
    .where('id', '=', resolvedOrganizationId)
    .select([
      'id',
      'name',
      'planType',
      'lifecycleStatus',
      'provisioningStatus',
      'createdAt',
    ])
    .executeTakeFirst()

  if (!organization) {
    return {
      error: {
        status: 404,
        code: 'ONBOARDING_ORGANIZATION_NOT_FOUND',
        message: 'Onboarding organization not found.',
      },
    } as const
  }

  return { organization, member } as const
}

const resolveOnboardingNextAction = (input: {
  lifecycleStatus: string
  provisioningStatus: string
  latestJobStatus: string | null
  canRetry: boolean
}) => {
  if (
    input.lifecycleStatus === 'workspace_active' &&
    input.provisioningStatus === 'completed'
  ) {
    return 'workspace_ready' as const
  }

  if (input.lifecycleStatus === 'payment_required') {
    return 'payment_required' as const
  }

  if (input.latestJobStatus === 'failed' && input.canRetry) {
    return 'retry_available' as const
  }

  return 'provisioning' as const
}

const buildOnboardingProvisioningStatusPayload = async (input: {
  userId: string
  isAdmin: boolean
  organizationId?: string
}) => {
  const resolved = await resolveOrganizationForUser({
    userId: input.userId,
    organizationId: input.organizationId,
  })

  if ('error' in resolved) {
    return resolved
  }

  const { organization, member } = resolved
  const latestJobRecord = await db
    .selectFrom('agent_provisioning_job')
    .where('organizationId', '=', organization.id)
    .orderBy('createdAt', 'desc')
    .select(['id'])
    .executeTakeFirst()

  const latestJob =
    latestJobRecord &&
    (await getProvisioningStatusByJobId({
      jobId: latestJobRecord.id,
      userId: input.userId,
      isAdmin: input.isAdmin,
    }))

  const canRetry =
    Boolean(latestJob?.retry.eligible) && canRetryByRole(member.role)

  const latestJobStatus = latestJob?.status || null
  const nextAction = resolveOnboardingNextAction({
    lifecycleStatus: organization.lifecycleStatus,
    provisioningStatus: organization.provisioningStatus,
    latestJobStatus,
    canRetry,
  })

  const events = latestJob
    ? latestJob.steps
        .map((step) => ({
          id: step.id,
          level: step.status === 'failed' ? 'error' : 'info',
          eventType: step.name,
          message:
            step.errorMessage ||
            `${step.name} is ${step.status.replace('_', ' ')}.`,
          correlationId: step.correlationId || latestJob.correlationId,
          metadata: {
            status: step.status,
            attempt: step.attempt,
            errorCode: step.errorCode,
            remediationAction: step.remediationAction,
          },
          createdAt: step.completedAt || step.startedAt || latestJob.updatedAt,
        }))
        .sort((left, right) =>
          String(right.createdAt || '').localeCompare(
            String(left.createdAt || ''),
          ),
        )
    : []

  return {
    data: {
      organization: {
        id: organization.id,
        name: organization.name,
        planType: organization.planType,
        lifecycleStatus: organization.lifecycleStatus,
        provisioningStatus: organization.provisioningStatus,
      },
      latestJob: latestJob
        ? {
            id: latestJob.jobId,
            status: latestJob.status,
            idempotencyKey: null,
            correlationId: latestJob.correlationId,
            lifecycleTarget: null,
            attempts: latestJob.retry.retryCount,
            errorMessage: latestJob.lastError?.message || null,
            queuedAt: null,
            startedAt: latestJob.startedAt,
            completedAt: latestJob.completedAt,
            createdAt: latestJob.startedAt,
            updatedAt: latestJob.updatedAt,
          }
        : null,
      events,
      canRetry,
      nextAction,
    },
  } as const
}

const handleProvisioningStatusError = (
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
    message:
      error instanceof Error
        ? error.message
        : 'Failed to load provisioning status.',
    userMessage: 'Unable to load provisioning status right now.',
  })
}

export const onboardOrganization: AuthRequestHandler<
  OrgOnboardingRequest
> = async (req, res) => {
  const { name, domain } = req.validated
  const wizardInput = resolveWizardInputFromOnboarding(req.validated)

  const idempotencyKey =
    resolveIdempotencyKey(req) || `onboarding:${req.user.id}:${Date.now()}`

  const requestCorrelationId = getCorrelationId(req, res)
  const correlationId =
    requestCorrelationId === 'unknown'
      ? `wizard-onboarding:${req.user.id}`
      : requestCorrelationId

  const knowledgeSources = wizardInput.knowledgeSources || []
  const website = knowledgeSources.find((source) => {
    try {
      new URL(source)
      return true
    } catch {
      return false
    }
  })

  const provisioningStart = await startOnboardingProvisioning({
    requestedByUserId: req.user.id,
    idempotencyKey,
    correlationId,
    wizardInput: {
      name,
      domain,
      industry: wizardInput.industry,
      services: wizardInput.services,
      useCase: wizardInput.useCase,
      website,
      knowledgeSources,
      mainGoal: wizardInput.mainObjective,
      voiceSelection: wizardInput.voiceSelection,
      greeting: wizardInput.greeting,
      routing: wizardInput.routing,
      agent: {
        name: wizardInput.agentName,
        openingLine:
          wizardInput.greeting.mode === 'custom'
            ? wizardInput.greeting.customText
            : undefined,
        serviceQuestions: wizardInput.discoveryQuestions || [],
      },
    },
  })

  res.status(202).json({
    data: {
      organization: provisioningStart.organization,
      agent: {
        id: provisioningStart.agent.id,
        degradedMode: {
          enabled: provisioningStart.agent.readinessStatus !== 'ready',
          reason:
            provisioningStart.agent.readinessStatus === 'ready'
              ? null
              : 'local_fallback_agent',
        },
      },
      provisioning: {
        jobId: provisioningStart.job.id,
        status: provisioningStart.job.status,
        correlationId: provisioningStart.job.correlationId,
        idempotentReplay: provisioningStart.reusedExisting,
      },
    },
    correlationId,
  })
}

export const getOnboardingProvisioningStatus: AuthRequestHandler<
  OnboardingProvisioningStatusRequest
> = async (req, res) => {
  try {
    const payload = await buildOnboardingProvisioningStatusPayload({
      userId: req.user.id,
      isAdmin: req.user.isAdmin,
      organizationId: req.validated.organizationId,
    })

    const payloadError = (
      payload as {
        error?: { status: number; code: string; message: string }
      }
    ).error

    if (payloadError) {
      return sendApiError(req, res, payloadError.status, {
        code: payloadError.code,
        message: payloadError.message,
        userMessage: payloadError.message,
      })
    }

    return res.json(payload)
  } catch (error) {
    return handleProvisioningStatusError(req, res, error)
  }
}

export const retryOnboardingProvisioning: AuthRequestHandler<
  RetryOnboardingProvisioningRequest
> = async (req, res) => {
  try {
    const resolved = await resolveOrganizationForUser({
      userId: req.user.id,
      organizationId: req.validated.organizationId,
    })

    const resolvedError = (
      resolved as {
        error?: { status: number; code: string; message: string }
      }
    ).error

    if (resolvedError) {
      return sendApiError(req, res, resolvedError.status, {
        code: resolvedError.code,
        message: resolvedError.message,
        userMessage: resolvedError.message,
      })
    }

    const resolvedResult = resolved as {
      organization: { id: string }
      member: { role: string }
    }

    if (!canRetryByRole(resolvedResult.member.role)) {
      return sendApiError(req, res, 403, {
        code: 'PROVISIONING_RETRY_FORBIDDEN',
        message: 'Only owners or admins can retry provisioning.',
        userMessage: 'Only owners or admins can retry provisioning.',
      })
    }

    const latestJobRecord = await db
      .selectFrom('agent_provisioning_job')
      .where('organizationId', '=', resolvedResult.organization.id)
      .orderBy('createdAt', 'desc')
      .select(['id'])
      .executeTakeFirst()

    if (!latestJobRecord) {
      return sendApiError(req, res, 404, {
        code: 'PROVISIONING_NOT_FOUND',
        message: 'No provisioning job found for this organization.',
        userMessage: 'No provisioning job is available to retry yet.',
      })
    }

    await retryProvisioningJobById({
      jobId: latestJobRecord.id,
      userId: req.user.id,
      isAdmin: req.user.isAdmin,
      idempotencyKey: resolveIdempotencyKey(req),
    })

    const payload = await buildOnboardingProvisioningStatusPayload({
      userId: req.user.id,
      isAdmin: req.user.isAdmin,
      organizationId: resolvedResult.organization.id,
    })

    const payloadError = (
      payload as {
        error?: { status: number; code: string; message: string }
      }
    ).error

    if (payloadError) {
      return sendApiError(req, res, payloadError.status, {
        code: payloadError.code,
        message: payloadError.message,
        userMessage: payloadError.message,
      })
    }

    return res.status(202).json(payload)
  } catch (error) {
    return handleProvisioningStatusError(req, res, error)
  }
}

interface DeleteOrganizationDevRequest {
  organizationId: string
}

// Development-only organization delete for the current user (owner or admin)
export const deleteOrganizationDev: AuthRequestHandler<
  DeleteOrganizationDevRequest
> = async (req, res) => {
  if (config.nodeEnv === 'production') {
    return res.status(403).json({ error: 'Not available in production' })
  }

  // Accept org id from validated payload or params to avoid validation mismatch
  const organizationId =
    (req.validated as any)?.organizationId || req.params.organizationId

  // In development, allow any authenticated user to delete if they can reach this route.
  // (We keep production locked above.)

  const existingOrg = await db
    .selectFrom('organization')
    .select(['id', 'name'])
    .where('id', '=', organizationId)
    .executeTakeFirst()

  if (!existingOrg) {
    return res.status(404).json({ error: 'Organization not found' })
  }

  await db.deleteFrom('organization').where('id', '=', organizationId).execute()

  res.json({
    success: true,
    message: `Organization "${existingOrg.name}" deleted (development only)`,
  })
}
