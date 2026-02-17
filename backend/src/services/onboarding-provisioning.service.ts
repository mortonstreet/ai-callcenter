import { randomUUID } from 'crypto'
import {
  DBAgent,
  DBOnboardingProvisioningEvent,
  DBOnboardingProvisioningJob,
  DBOrganization,
} from '@shared/db/src'
import { AgentExternalType } from '@shared/types/src'
import logger from '@/lib/logger'
import { db } from '@/lib/db'
import { enqueueQueueJob } from '@/queues'
import {
  createOnboardingProvisioningEvent,
  createOnboardingProvisioningJob,
  findLatestOnboardingProvisioningJob,
  findOnboardingProvisioningJobById,
  findOnboardingProvisioningJobByIdempotencyKey,
  listOnboardingProvisioningEvents,
  updateOnboardingProvisioningJob,
} from '@/repositories/onboarding-provisioning.repository'
import {
  findById as findOrganizationById,
  findByOnboardingIdempotencyKey,
  findMember,
} from '@/repositories/organization.repository'
import { withId } from '@/repositories/utils'
import {
  createElevenLabsAgent,
  retryAgentProvision,
} from '@/services/agent.service'
import { updateUserLastActiveOrganizationId } from '@/repositories/auth.repository'
import { formatToSlug } from '@/utils'
import { QueueJobPayload, QUEUE_NAMES } from '@/types/queues'

export const ONBOARDING_PROVISIONING_JOB_NAME = 'onboarding-provisioning'

export interface OnboardingProvisioningQueuePayload extends QueueJobPayload {
  provisioningJobId: string
  organizationId: string
  correlationId: string
}

export interface OnboardingAgentPayload {
  name: string
  openingLine?: string
  serviceQuestions?: string[]
}

export interface OnboardingQualificationPayload {
  teamSize?: string
  monthlyLeadVolume?: string
  rolloutTimeline?: string
  notes?: string
}

export interface SubmitOnboardingInput {
  userId: string
  correlationId: string
  idempotencyKey: string
  name: string
  domain?: string
  industry: string
  services: string[]
  useCase?: string
  website?: string
  mainGoal?: string
  businessRole?: string
  demoIntent: boolean
  qualification?: OnboardingQualificationPayload
  agent: OnboardingAgentPayload
}

interface StoredOnboardingProvisioningPayload {
  companyName: string
  industry: string
  services: string[]
  useCase?: string
  website?: string
  mainGoal?: string
  businessRole?: string
  demoIntent: boolean
  qualification?: OnboardingQualificationPayload
  agent: {
    name: string
    openingLine?: string
    serviceQuestions?: string[]
  }
}

interface OnboardingOrganizationSummary {
  id: string
  name: string
  planType: string
  lifecycleStatus: string
  provisioningStatus: string
}

interface OnboardingProvisioningJobSummary {
  id: string
  status: string
  idempotencyKey: string
  correlationId: string
  lifecycleTarget: string | null
  attempts: number
  errorMessage: string | null
  queuedAt: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

interface OnboardingProvisioningEventSummary {
  id: string
  level: string
  eventType: string
  message: string
  correlationId: string
  metadata: unknown | null
  createdAt: string | null
}

export interface OnboardingProvisioningStatusView {
  organization: OnboardingOrganizationSummary
  latestJob: OnboardingProvisioningJobSummary | null
  events: OnboardingProvisioningEventSummary[]
  canRetry: boolean
  nextAction:
    | 'workspace_ready'
    | 'payment_required'
    | 'retry_available'
    | 'provisioning'
}

export interface SubmitOnboardingResult {
  organizationId: string
  status: OnboardingProvisioningStatusView
  idempotent: boolean
}

interface ResolveOrganizationInput {
  userId: string
  organizationId?: string
}

interface RetryOnboardingProvisioningInput {
  userId: string
  correlationId: string
  organizationId?: string
}

interface RetryOnboardingProvisioningResult {
  status: OnboardingProvisioningStatusView
}

interface OnboardingProvisioningServiceErrorInput {
  status: number
  code: string
  message: string
  userMessage: string
  details?: unknown
}

export class OnboardingProvisioningServiceError extends Error {
  status: number
  code: string
  userMessage: string
  details?: unknown

  constructor(input: OnboardingProvisioningServiceErrorInput) {
    super(input.message)
    this.name = 'OnboardingProvisioningServiceError'
    this.status = input.status
    this.code = input.code
    this.userMessage = input.userMessage
    this.details = input.details
  }
}

const isUniqueViolation = (error: unknown) => {
  const candidate = error as {
    code?: string
    cause?: {
      code?: string
    }
  }

  return candidate?.code === '23505' || candidate?.cause?.code === '23505'
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  return 'Unknown onboarding provisioning error'
}

const toDate = (value?: string | Date | null): Date | null => {
  if (!value) return null
  if (value instanceof Date) return value

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

const toIso = (value?: string | Date | null): string | null => {
  const parsed = toDate(value)
  return parsed ? parsed.toISOString() : null
}

const sanitizeString = (value?: string | null): string | undefined => {
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const sanitizeStringArray = (values?: string[] | null): string[] => {
  if (!Array.isArray(values)) {
    return []
  }

  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

const asOptionalString = (value: unknown): string | undefined => {
  return typeof value === 'string' ? sanitizeString(value) : undefined
}

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return sanitizeStringArray(
    value.filter((entry): entry is string => typeof entry === 'string'),
  )
}

const resolvePlanType = (demoIntent: boolean): 'demo' | 'paid' => {
  return demoIntent ? 'demo' : 'paid'
}

const resolveLifecycleTarget = (planType: string): string => {
  return planType === 'paid' ? 'payment_required' : 'provisioning_pending'
}

const resolveLifecycleOnSuccess = (planType: string): string => {
  return planType === 'paid' ? 'payment_required' : 'workspace_active'
}

const toJobSummary = (
  job: DBOnboardingProvisioningJob,
): OnboardingProvisioningJobSummary => {
  return {
    id: job.id,
    status: job.status,
    idempotencyKey: job.idempotencyKey,
    correlationId: job.correlationId,
    lifecycleTarget: job.lifecycleTarget || null,
    attempts: Number(job.attempts || 0),
    errorMessage: job.errorMessage || null,
    queuedAt: toIso(job.queuedAt),
    startedAt: toIso(job.startedAt),
    completedAt: toIso(job.completedAt),
    createdAt: toIso(job.createdAt),
    updatedAt: toIso(job.updatedAt),
  }
}

const toEventSummary = (
  event: DBOnboardingProvisioningEvent,
): OnboardingProvisioningEventSummary => {
  return {
    id: event.id,
    level: event.level,
    eventType: event.eventType,
    message: event.message,
    correlationId: event.correlationId,
    metadata: event.metadata || null,
    createdAt: toIso(event.createdAt),
  }
}

const canRetryByRole = (role?: string | null) => {
  return role === 'owner' || role === 'admin'
}

const resolveNextAction = (input: {
  organization: DBOrganization
  latestJob: DBOnboardingProvisioningJob | null
  canRetry: boolean
}): OnboardingProvisioningStatusView['nextAction'] => {
  if (
    input.organization.lifecycleStatus === 'workspace_active' &&
    input.organization.provisioningStatus === 'completed'
  ) {
    return 'workspace_ready'
  }

  if (input.organization.lifecycleStatus === 'payment_required') {
    return 'payment_required'
  }

  if (input.latestJob?.status === 'failed' && input.canRetry) {
    return 'retry_available'
  }

  return 'provisioning'
}

const buildStatusView = async (input: {
  organization: DBOrganization
  memberRole: string
  latestJob: DBOnboardingProvisioningJob | null
}): Promise<OnboardingProvisioningStatusView> => {
  const events = input.latestJob
    ? await listOnboardingProvisioningEvents(input.latestJob.id, 30)
    : []

  const canRetry = !!(
    input.latestJob &&
    input.latestJob.status === 'failed' &&
    canRetryByRole(input.memberRole)
  )

  return {
    organization: {
      id: input.organization.id,
      name: input.organization.name,
      planType: input.organization.planType,
      lifecycleStatus: input.organization.lifecycleStatus,
      provisioningStatus: input.organization.provisioningStatus,
    },
    latestJob: input.latestJob ? toJobSummary(input.latestJob) : null,
    events: events.map(toEventSummary),
    canRetry,
    nextAction: resolveNextAction({
      organization: input.organization,
      latestJob: input.latestJob,
      canRetry,
    }),
  }
}

const resolveOrganizationAndMember = async (
  input: ResolveOrganizationInput,
) => {
  let organizationId = input.organizationId

  if (!organizationId) {
    const user = await db
      .selectFrom('user')
      .where('id', '=', input.userId)
      .select('lastActiveOrganizationId')
      .executeTakeFirst()

    organizationId = user?.lastActiveOrganizationId || undefined
  }

  if (!organizationId) {
    const fallbackMembership = await db
      .selectFrom('member')
      .innerJoin('organization', 'organization.id', 'member.organizationId')
      .where('member.userId', '=', input.userId)
      .orderBy('organization.createdAt', 'desc')
      .select(['member.organizationId'])
      .executeTakeFirst()

    organizationId = fallbackMembership?.organizationId
  }

  if (!organizationId) {
    throw new OnboardingProvisioningServiceError({
      status: 404,
      code: 'ONBOARDING_ORGANIZATION_NOT_FOUND',
      message: 'No organization is associated with this account.',
      userMessage: 'No onboarding organization found for this account.',
    })
  }

  const member = await findMember(organizationId, input.userId)
  if (!member) {
    throw new OnboardingProvisioningServiceError({
      status: 403,
      code: 'ONBOARDING_ORGANIZATION_FORBIDDEN',
      message: `User ${input.userId} is not a member of organization ${organizationId}`,
      userMessage: 'You do not have access to this organization.',
    })
  }

  const organization = await db
    .selectFrom('organization')
    .where('id', '=', organizationId)
    .selectAll()
    .executeTakeFirst()

  if (!organization) {
    throw new OnboardingProvisioningServiceError({
      status: 404,
      code: 'ONBOARDING_ORGANIZATION_NOT_FOUND',
      message: `Organization ${organizationId} was not found`,
      userMessage: 'Onboarding organization not found.',
    })
  }

  return {
    organization,
    member,
  }
}

const loadIdempotentOnboardingResult = async (input: {
  userId: string
  idempotencyKey: string
}): Promise<SubmitOnboardingResult | null> => {
  const existingJob = await findOnboardingProvisioningJobByIdempotencyKey(
    input.idempotencyKey,
  )

  if (!existingJob) {
    return null
  }

  const existingMember = await findMember(
    existingJob.organizationId,
    input.userId,
  )
  if (!existingMember) {
    return null
  }

  await updateUserLastActiveOrganizationId(
    input.userId,
    existingJob.organizationId,
  )

  const organization = await findOrganizationById(existingJob.organizationId)
  const status = await buildStatusView({
    organization,
    memberRole: existingMember.role,
    latestJob: existingJob,
  })

  return {
    organizationId: organization.id,
    status,
    idempotent: true,
  }
}

const queueProvisioningJob = async (job: DBOnboardingProvisioningJob) => {
  await enqueueQueueJob(
    QUEUE_NAMES.ONBOARDING_PROVISIONING,
    ONBOARDING_PROVISIONING_JOB_NAME,
    {
      provisioningJobId: job.id,
      organizationId: job.organizationId,
      correlationId: job.correlationId,
      idempotencyKey: `onboarding-provisioning:${job.id}`,
    },
    {
      attempts: 1,
      removeOnComplete: 500,
      removeOnFail: 500,
    },
  )
}

const parseProvisioningPayload = (
  payload: unknown,
): StoredOnboardingProvisioningPayload => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Provisioning payload is missing or invalid.')
  }

  const record = payload as Record<string, unknown>
  const agentRaw = record.agent

  if (!agentRaw || typeof agentRaw !== 'object' || Array.isArray(agentRaw)) {
    throw new Error('Provisioning payload is missing agent details.')
  }

  const agent = agentRaw as Record<string, unknown>
  const companyName = asOptionalString(record.companyName)
  const industry = asOptionalString(record.industry)
  const agentName = asOptionalString(agent.name)

  if (!companyName || !industry || !agentName) {
    throw new Error(
      'Provisioning payload is missing required onboarding fields.',
    )
  }

  return {
    companyName,
    industry,
    services: asStringArray(record.services),
    useCase: asOptionalString(record.useCase),
    website: asOptionalString(record.website),
    mainGoal: asOptionalString(record.mainGoal),
    businessRole: asOptionalString(record.businessRole),
    demoIntent: Boolean(record.demoIntent),
    qualification:
      record.qualification &&
      typeof record.qualification === 'object' &&
      !Array.isArray(record.qualification)
        ? (record.qualification as OnboardingQualificationPayload)
        : undefined,
    agent: {
      name: agentName,
      openingLine: asOptionalString(agent.openingLine),
      serviceQuestions: asStringArray(agent.serviceQuestions),
    },
  }
}

const pickPrimaryAgent = async (
  organizationId: string,
): Promise<DBAgent | null> => {
  const agent = await db
    .selectFrom('agent')
    .where('organizationId', '=', organizationId)
    .orderBy('createdAt', 'asc')
    .selectAll()
    .executeTakeFirst()

  return agent || null
}

const buildUniqueOrganizationSlug = async (organizationName: string) => {
  const baseSlug =
    sanitizeString(formatToSlug(organizationName)) || 'organization'
  let candidate = baseSlug

  for (let i = 0; i < 8; i += 1) {
    const existing = await db
      .selectFrom('organization')
      .where('slug', '=', candidate)
      .select('id')
      .executeTakeFirst()

    if (!existing) {
      return candidate
    }

    candidate = `${baseSlug}-${randomUUID().slice(0, 6)}`
  }

  return `${baseSlug}-${Date.now().toString(36)}`
}

export const submitOnboarding = async (
  input: SubmitOnboardingInput,
): Promise<SubmitOnboardingResult> => {
  const idempotentResult = await loadIdempotentOnboardingResult({
    userId: input.userId,
    idempotencyKey: input.idempotencyKey,
  })

  if (idempotentResult) {
    return idempotentResult
  }

  const now = new Date()
  const planType = resolvePlanType(input.demoIntent)
  const lifecycleTarget = resolveLifecycleTarget(planType)
  const services = sanitizeStringArray(input.services)
  const serviceQuestions = sanitizeStringArray(input.agent.serviceQuestions)
  const slug = await buildUniqueOrganizationSlug(input.name)

  const onboardingQualification = input.qualification
    ? {
        teamSize: sanitizeString(input.qualification.teamSize),
        monthlyLeadVolume: sanitizeString(
          input.qualification.monthlyLeadVolume,
        ),
        rolloutTimeline: sanitizeString(input.qualification.rolloutTimeline),
        notes: sanitizeString(input.qualification.notes),
      }
    : undefined

  const metadata = {
    domain: sanitizeString(input.domain),
    industry: input.industry,
    services,
    useCase: sanitizeString(input.useCase),
    website: sanitizeString(input.website),
    mainGoal: sanitizeString(input.mainGoal),
    businessRole: sanitizeString(input.businessRole),
    demoIntent: input.demoIntent,
    qualification: onboardingQualification,
    agent: {
      openingLine: sanitizeString(input.agent.openingLine),
      serviceQuestions,
    },
  }

  const payload: StoredOnboardingProvisioningPayload = {
    companyName: input.name,
    industry: input.industry,
    services,
    useCase: sanitizeString(input.useCase),
    website: sanitizeString(input.website),
    mainGoal: sanitizeString(input.mainGoal),
    businessRole: sanitizeString(input.businessRole),
    demoIntent: input.demoIntent,
    qualification: onboardingQualification,
    agent: {
      name: input.agent.name,
      openingLine: sanitizeString(input.agent.openingLine),
      serviceQuestions,
    },
  }

  let organization: DBOrganization
  let provisioningJob: DBOnboardingProvisioningJob

  try {
    const created = await db.transaction().execute(async (trx) => {
      const createdOrganization = await trx
        .insertInto('organization')
        .values(
          withId({
            name: input.name,
            slug,
            createdAt: now,
            metadata: JSON.stringify(metadata),
            lifecycleStatus: lifecycleTarget,
            planType,
            provisioningStatus: 'pending',
            onboardingIdempotencyKey: input.idempotencyKey,
            onboardingBusinessRole: sanitizeString(input.businessRole) || null,
            onboardingDemoIntent: input.demoIntent,
            onboardingQualification: onboardingQualification || null,
            onboardingCompletedAt: now,
          }),
        )
        .returningAll()
        .executeTakeFirstOrThrow()

      await trx
        .insertInto('member')
        .values(
          withId({
            organizationId: createdOrganization.id,
            userId: input.userId,
            role: 'owner',
            createdAt: now,
          }),
        )
        .executeTakeFirst()

      const createdJob = await trx
        .insertInto('onboarding_provisioning_job')
        .values(
          withId({
            organizationId: createdOrganization.id,
            submittedByUserId: input.userId,
            correlationId: input.correlationId,
            idempotencyKey: input.idempotencyKey,
            status: 'pending',
            lifecycleTarget,
            errorMessage: null,
            payload,
            attempts: 0,
            queuedAt: now,
            startedAt: null,
            completedAt: null,
            updatedAt: now,
          }),
        )
        .returningAll()
        .executeTakeFirstOrThrow()

      await trx
        .insertInto('onboarding_provisioning_event')
        .values(
          withId({
            provisioningJobId: createdJob.id,
            organizationId: createdOrganization.id,
            correlationId: input.correlationId,
            level: 'info',
            eventType: 'onboarding_submitted',
            message:
              'Onboarding submission accepted and provisioning initialized.',
            metadata: {
              lifecycleTarget,
              planType,
              businessRole: sanitizeString(input.businessRole) || null,
              demoIntent: input.demoIntent,
            },
          }),
        )
        .executeTakeFirst()

      return {
        organization: createdOrganization,
        provisioningJob: createdJob,
      }
    })

    organization = created.organization
    provisioningJob = created.provisioningJob
  } catch (error) {
    if (isUniqueViolation(error)) {
      const duplicate = await loadIdempotentOnboardingResult({
        userId: input.userId,
        idempotencyKey: input.idempotencyKey,
      })

      if (duplicate) {
        return duplicate
      }

      const duplicateOrganization = await findByOnboardingIdempotencyKey(
        input.idempotencyKey,
      )

      if (duplicateOrganization) {
        throw new OnboardingProvisioningServiceError({
          status: 409,
          code: 'ONBOARDING_IN_PROGRESS',
          message:
            'An onboarding submission with this idempotency key is already in progress.',
          userMessage:
            'A matching onboarding request is already being processed. Please refresh to continue.',
          details: {
            organizationId: duplicateOrganization.id,
            idempotencyKey: input.idempotencyKey,
          },
        })
      }
    }

    throw error
  }

  await updateUserLastActiveOrganizationId(input.userId, organization.id)

  if (planType === 'demo') {
    try {
      await queueProvisioningJob(provisioningJob)

      await createOnboardingProvisioningEvent({
        provisioningJobId: provisioningJob.id,
        organizationId: organization.id,
        correlationId: provisioningJob.correlationId,
        level: 'info',
        eventType: 'job_enqueued',
        message: 'Provisioning job enqueued for worker execution.',
        metadata: {
          queueName: QUEUE_NAMES.ONBOARDING_PROVISIONING,
          jobName: ONBOARDING_PROVISIONING_JOB_NAME,
        },
      })
    } catch (error) {
      const enqueueMessage = getErrorMessage(error)

      await updateOnboardingProvisioningJob(provisioningJob.id, {
        status: 'failed',
        errorMessage: enqueueMessage,
        completedAt: new Date(),
      })

      await createOnboardingProvisioningEvent({
        provisioningJobId: provisioningJob.id,
        organizationId: organization.id,
        correlationId: provisioningJob.correlationId,
        level: 'error',
        eventType: 'job_enqueue_failed',
        message: `Failed to enqueue provisioning job: ${enqueueMessage}`,
        metadata: {
          queueName: QUEUE_NAMES.ONBOARDING_PROVISIONING,
        },
      })

      await db
        .updateTable('organization')
        .set({
          provisioningStatus: 'failed',
          lifecycleStatus: 'provisioning_pending',
        })
        .where('id', '=', organization.id)
        .executeTakeFirst()
    }
  } else {
    await createOnboardingProvisioningEvent({
      provisioningJobId: provisioningJob.id,
      organizationId: organization.id,
      correlationId: provisioningJob.correlationId,
      level: 'info',
      eventType: 'awaiting_payment',
      message:
        'Paid plan selected. Provisioning will proceed after payment verification.',
      metadata: {
        planType,
        lifecycleStatus: 'payment_required',
      },
    })
  }

  const latestJob = await findLatestOnboardingProvisioningJob(organization.id)
  const status = await buildStatusView({
    organization: await findOrganizationById(organization.id),
    memberRole: 'owner',
    latestJob: latestJob || null,
  })

  return {
    organizationId: organization.id,
    status,
    idempotent: false,
  }
}

export const getOnboardingProvisioningStatus = async (input: {
  userId: string
  organizationId?: string
}): Promise<OnboardingProvisioningStatusView> => {
  const { organization, member } = await resolveOrganizationAndMember({
    userId: input.userId,
    organizationId: input.organizationId,
  })

  const latestJob = await findLatestOnboardingProvisioningJob(organization.id)

  return buildStatusView({
    organization,
    memberRole: member.role,
    latestJob: latestJob || null,
  })
}

export const retryOnboardingProvisioning = async (
  input: RetryOnboardingProvisioningInput,
): Promise<RetryOnboardingProvisioningResult> => {
  const { organization, member } = await resolveOrganizationAndMember({
    userId: input.userId,
    organizationId: input.organizationId,
  })

  if (!canRetryByRole(member.role)) {
    throw new OnboardingProvisioningServiceError({
      status: 403,
      code: 'ONBOARDING_RETRY_FORBIDDEN',
      message: `User role ${member.role} cannot retry provisioning for organization ${organization.id}`,
      userMessage:
        'Only owners or admins can retry provisioning for this organization.',
    })
  }

  const latestJob = await findLatestOnboardingProvisioningJob(organization.id)

  if (!latestJob) {
    throw new OnboardingProvisioningServiceError({
      status: 404,
      code: 'ONBOARDING_JOB_NOT_FOUND',
      message: `No provisioning job found for organization ${organization.id}`,
      userMessage: 'No provisioning job is available to retry yet.',
    })
  }

  if (latestJob.status !== 'failed') {
    throw new OnboardingProvisioningServiceError({
      status: 409,
      code: 'ONBOARDING_RETRY_INVALID_STATE',
      message: `Provisioning retry requested while latest job is ${latestJob.status}`,
      userMessage: 'Provisioning can only be retried after a failed attempt.',
      details: {
        status: latestJob.status,
      },
    })
  }

  const correlationId = input.correlationId || randomUUID()
  const lifecycleTarget = resolveLifecycleTarget(organization.planType)

  const retryJob = await createOnboardingProvisioningJob({
    organizationId: organization.id,
    submittedByUserId: input.userId,
    correlationId,
    idempotencyKey: `onboarding-retry:${organization.id}:${randomUUID()}`,
    status: 'pending',
    lifecycleTarget,
    errorMessage: null,
    payload: latestJob.payload,
    attempts: 0,
    queuedAt: new Date(),
    startedAt: null,
    completedAt: null,
    updatedAt: new Date(),
  })

  await createOnboardingProvisioningEvent({
    provisioningJobId: retryJob.id,
    organizationId: organization.id,
    correlationId,
    level: 'info',
    eventType: 'manual_retry_requested',
    message: `Manual provisioning retry requested by ${input.userId}.`,
    metadata: {
      previousJobId: latestJob.id,
      previousStatus: latestJob.status,
    },
  })

  await db
    .updateTable('organization')
    .set({
      provisioningStatus: 'pending',
      lifecycleStatus: lifecycleTarget,
    })
    .where('id', '=', organization.id)
    .executeTakeFirst()

  try {
    await queueProvisioningJob(retryJob)
  } catch (error) {
    const enqueueMessage = getErrorMessage(error)

    await updateOnboardingProvisioningJob(retryJob.id, {
      status: 'failed',
      errorMessage: enqueueMessage,
      completedAt: new Date(),
    })

    await createOnboardingProvisioningEvent({
      provisioningJobId: retryJob.id,
      organizationId: organization.id,
      correlationId,
      level: 'error',
      eventType: 'retry_enqueue_failed',
      message: `Retry enqueue failed: ${enqueueMessage}`,
      metadata: {
        queueName: QUEUE_NAMES.ONBOARDING_PROVISIONING,
      },
    })

    await db
      .updateTable('organization')
      .set({
        provisioningStatus: 'failed',
        lifecycleStatus: lifecycleTarget,
      })
      .where('id', '=', organization.id)
      .executeTakeFirst()
  }

  return {
    status: await buildStatusView({
      organization: await findOrganizationById(organization.id),
      memberRole: member.role,
      latestJob:
        (await findLatestOnboardingProvisioningJob(organization.id)) || null,
    }),
  }
}

const markProvisioningFailure = async (input: {
  organization: DBOrganization
  provisioningJob: DBOnboardingProvisioningJob
  message: string
}) => {
  const lifecycleStatus = resolveLifecycleTarget(input.organization.planType)

  await updateOnboardingProvisioningJob(input.provisioningJob.id, {
    status: 'failed',
    errorMessage: input.message,
    completedAt: new Date(),
  })

  await createOnboardingProvisioningEvent({
    provisioningJobId: input.provisioningJob.id,
    organizationId: input.organization.id,
    correlationId: input.provisioningJob.correlationId,
    level: 'error',
    eventType: 'provisioning_failed',
    message: input.message,
    metadata: {
      lifecycleStatus,
    },
  })

  await db
    .updateTable('organization')
    .set({
      provisioningStatus: 'failed',
      lifecycleStatus,
    })
    .where('id', '=', input.organization.id)
    .executeTakeFirst()
}

export const processOnboardingProvisioningJob = async (
  payload: OnboardingProvisioningQueuePayload,
) => {
  const provisioningJob = await findOnboardingProvisioningJobById(
    payload.provisioningJobId,
  )

  if (!provisioningJob) {
    throw new Error(
      `Onboarding provisioning job ${payload.provisioningJobId} not found`,
    )
  }

  if (provisioningJob.status === 'completed') {
    return {
      processed: false,
      reason: 'already_completed',
    }
  }

  const organization = await db
    .selectFrom('organization')
    .where('id', '=', provisioningJob.organizationId)
    .selectAll()
    .executeTakeFirst()

  if (!organization) {
    throw new Error(
      `Organization ${provisioningJob.organizationId} not found for provisioning job ${provisioningJob.id}`,
    )
  }

  const lifecycleTarget = resolveLifecycleTarget(organization.planType)

  await updateOnboardingProvisioningJob(provisioningJob.id, {
    status: 'running',
    startedAt: new Date(),
    completedAt: null,
    errorMessage: null,
    attempts: Number(provisioningJob.attempts || 0) + 1,
  })

  await db
    .updateTable('organization')
    .set({
      provisioningStatus: 'running',
      lifecycleStatus: lifecycleTarget,
    })
    .where('id', '=', organization.id)
    .executeTakeFirst()

  await createOnboardingProvisioningEvent({
    provisioningJobId: provisioningJob.id,
    organizationId: organization.id,
    correlationId: provisioningJob.correlationId,
    level: 'info',
    eventType: 'provisioning_started',
    message: 'Provisioning worker started onboarding orchestration.',
    metadata: {
      attempt: Number(provisioningJob.attempts || 0) + 1,
      queueCorrelationId: payload.correlationId,
    },
  })

  try {
    const parsedPayload = parseProvisioningPayload(provisioningJob.payload)
    const existingAgent = await pickPrimaryAgent(organization.id)

    let provisionedAgent: DBAgent

    if (existingAgent) {
      if (
        existingAgent.externalType === AgentExternalType.ELEVEN_LABS &&
        !existingAgent.syncPending
      ) {
        provisionedAgent = existingAgent
      } else {
        provisionedAgent = await retryAgentProvision({
          agentId: existingAgent.id,
          organizationId: organization.id,
          companyName: parsedPayload.companyName,
          name: parsedPayload.agent.name,
          industry: parsedPayload.industry,
          useCase: parsedPayload.useCase,
          website: parsedPayload.website,
          mainGoal: parsedPayload.mainGoal,
          firstMessage: parsedPayload.agent.openingLine,
          services: parsedPayload.services,
          serviceQuestions: parsedPayload.agent.serviceQuestions,
          providerCorrelationKey:
            existingAgent.providerCorrelationKey ||
            `${organization.id}:${existingAgent.id}`,
          idempotencyKey: `onboarding-retry-agent:${existingAgent.id}`,
        })
      }
    } else {
      provisionedAgent = await createElevenLabsAgent({
        organizationId: organization.id,
        companyName: parsedPayload.companyName,
        name: parsedPayload.agent.name,
        industry: parsedPayload.industry,
        useCase: parsedPayload.useCase,
        website: parsedPayload.website,
        mainGoal: parsedPayload.mainGoal,
        firstMessage: parsedPayload.agent.openingLine,
        services: parsedPayload.services,
        serviceQuestions: parsedPayload.agent.serviceQuestions,
        providerCorrelationKey: provisioningJob.correlationId,
      })
    }

    if (
      provisionedAgent.externalType === AgentExternalType.LOCAL_FALLBACK ||
      provisionedAgent.syncPending
    ) {
      throw new Error(
        provisionedAgent.lastSyncError ||
          'Primary agent provisioning is degraded and requires retry.',
      )
    }

    const lifecycleStatus = resolveLifecycleOnSuccess(organization.planType)

    await updateOnboardingProvisioningJob(provisioningJob.id, {
      status: 'completed',
      errorMessage: null,
      completedAt: new Date(),
    })

    await createOnboardingProvisioningEvent({
      provisioningJobId: provisioningJob.id,
      organizationId: organization.id,
      correlationId: provisioningJob.correlationId,
      level: 'info',
      eventType: 'provisioning_completed',
      message: 'Provisioning orchestration completed successfully.',
      metadata: {
        agentId: provisionedAgent.id,
        externalType: provisionedAgent.externalType,
        lifecycleStatus,
      },
    })

    await db
      .updateTable('organization')
      .set({
        provisioningStatus: 'completed',
        lifecycleStatus,
      })
      .where('id', '=', organization.id)
      .executeTakeFirst()

    return {
      processed: true,
      organizationId: organization.id,
      provisioningJobId: provisioningJob.id,
      agentId: provisionedAgent.id,
    }
  } catch (error) {
    const message = getErrorMessage(error)

    await markProvisioningFailure({
      organization,
      provisioningJob,
      message,
    })

    logger.error(
      {
        error,
        organizationId: organization.id,
        provisioningJobId: provisioningJob.id,
        correlationId: provisioningJob.correlationId,
      },
      'Onboarding provisioning job failed',
    )

    throw error instanceof Error ? error : new Error(message)
  }
}
