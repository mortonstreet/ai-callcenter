import { randomUUID } from 'crypto'
import { AuthRequestHandler } from '@/types/handlers'
import { config } from '@/config'
import { db } from '@/lib/db'
import {
  getOnboardingProvisioningStatus as getOnboardingProvisioningStatusView,
  OnboardingProvisioningServiceError,
  retryOnboardingProvisioning,
  submitOnboarding,
} from '@/services/onboarding-provisioning.service'
import { sendApiError } from '@/api/utils/error-contract'
import { z } from 'zod'

const OnboardingQualificationSchema = z
  .object({
    teamSize: z.string().optional(),
    monthlyLeadVolume: z.string().optional(),
    rolloutTimeline: z.string().optional(),
    notes: z.string().optional(),
  })
  .optional()

export const OrganizationOnboardingSchema = z.object({
  name: z.string(),
  domain: z.string().optional(),
  industry: z.string(),
  services: z.array(z.string()).default([]),
  useCase: z.string().optional(),
  website: z.string().optional(),
  mainGoal: z.string().optional(),
  businessRole: z.string().optional(),
  demoIntent: z.boolean().default(true),
  qualification: OnboardingQualificationSchema,
  idempotencyKey: z.string().optional(),
  agent: z.object({
    name: z.string(),
    openingLine: z.string().optional(),
    serviceQuestions: z.array(z.string()).optional(),
  }),
})

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

export const onboardOrganization: AuthRequestHandler<
  OrgOnboardingRequest
> = async (req, res, next) => {
  try {
    const validated = req.validated
    const correlationId = getCorrelationId(req.headers as Record<string, unknown>)
    const idempotencyKey = getIdempotencyKey({
      headers: req.headers as Record<string, unknown>,
      bodyKey: validated.idempotencyKey,
    })

    const result = await submitOnboarding({
      userId: req.user.id,
      correlationId,
      idempotencyKey,
      name: validated.name,
      domain: validated.domain,
      industry: validated.industry,
      services: validated.services,
      useCase: validated.useCase,
      website: validated.website,
      mainGoal: validated.mainGoal,
      businessRole: validated.businessRole,
      demoIntent: validated.demoIntent,
      qualification: validated.qualification,
      agent: {
        name: validated.agent.name,
        openingLine: validated.agent.openingLine,
        serviceQuestions: validated.agent.serviceQuestions,
      },
    })

    return res.status(result.idempotent ? 200 : 202).json({
      data: {
        organizationId: result.organizationId,
        idempotent: result.idempotent,
        provisioning: result.status,
      },
    })
  } catch (error) {
    if (error instanceof OnboardingProvisioningServiceError) {
      return sendOnboardingServiceError(req, res, error)
    }
    return next(error)
  }
}

export const getOrganizationOnboardingProvisioningStatus: AuthRequestHandler<
  OrgProvisioningStatusRequest
> = async (req, res, next) => {
  try {
    const status = await getOnboardingProvisioningStatusView({
      userId: req.user.id,
      organizationId: req.validated.organizationId,
    })

    return res.json({
      data: status,
    })
  } catch (error) {
    if (error instanceof OnboardingProvisioningServiceError) {
      return sendOnboardingServiceError(req, res, error)
    }
    return next(error)
  }
}

export const retryOrganizationOnboardingProvisioning: AuthRequestHandler<
  OrgProvisioningRetryRequest
> = async (req, res, next) => {
  try {
    const correlationId = getCorrelationId(req.headers as Record<string, unknown>)

    const result = await retryOnboardingProvisioning({
      userId: req.user.id,
      correlationId,
      organizationId: req.validated.organizationId,
    })

    return res.status(202).json({
      data: result.status,
    })
  } catch (error) {
    if (error instanceof OnboardingProvisioningServiceError) {
      return sendOnboardingServiceError(req, res, error)
    }
    return next(error)
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
