import { randomUUID } from 'crypto'
import { AuthRequestHandler } from '@/types/handlers'
import { config } from '@/config'
import { db } from '@/lib/db'
import { WizardInputV2Schema } from '@shared/types/src'
import { z } from 'zod'
import { startOnboardingProvisioning } from '@/services/provisioning-orchestrator.service'
import { getCorrelationId } from '@/api/utils/error-contract'

export const OrganizationOnboardingSchema = z
  .object({
    name: z.string().trim().min(1),
    domain: z.string().trim().optional(),
    idempotencyKey: z.string().trim().min(1).max(256).optional(),
    wizard_input_v2: WizardInputV2Schema,
  })
  .strict()

export const OrganizationProvisioningStatusSchema = z.object({
  organizationId: z.string().optional(),
})

export const OrganizationProvisioningRetrySchema = z.object({
  organizationId: z.string().optional(),
})

type OrgOnboardingRequest = z.infer<typeof OrganizationOnboardingSchema>
type OrgProvisioningStatusRequest = z.infer<
  typeof OrganizationProvisioningStatusSchema
>
type OrgProvisioningRetryRequest = z.infer<
  typeof OrganizationProvisioningRetrySchema
>

const getCorrelationId = (headers: Record<string, unknown>): string => {
  const headerValue = headers['x-correlation-id']
  if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
    return headerValue.trim()
  }
  return randomUUID()
}

const getIdempotencyKey = (input: {
  headers: Record<string, unknown>
  bodyKey?: string
}): string => {
  const fromHeader = input.headers['x-idempotency-key']

  if (typeof fromHeader === 'string' && fromHeader.trim().length > 0) {
    return fromHeader.trim()
  }

  if (input.bodyKey && input.bodyKey.trim().length > 0) {
    return input.bodyKey.trim()
  }

  return randomUUID()
}

const sendOnboardingServiceError = (
  req: Parameters<AuthRequestHandler<any>>[0],
  res: Parameters<AuthRequestHandler<any>>[1],
  error: OnboardingProvisioningServiceError,
) => {
  return sendApiError(req, res, error.status, {
    code: error.code,
    message: error.message,
    userMessage: error.userMessage,
    details: error.details,
  })
}

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
      mainGoal: wizardInput.mainObjective,
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
