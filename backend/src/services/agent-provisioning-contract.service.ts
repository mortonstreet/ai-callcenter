import { randomUUID, createHash } from 'crypto'
import { formatToSlug } from '@/utils'
import { AgentExternalType } from '@shared/types/src'
import { enqueueQueueJob } from '@/queues'
import { QUEUE_NAMES } from '@/types/queues'
import {
  AgentProvisioningJobStatusSchema,
  AgentProvisioningStepIdSchema,
  AgentProvisioningStepStatusSchema,
  CreateElevenLabsAgentRequest,
  WIZARD_INPUT_SCHEMA_VERSION,
  WIZARD_INTENT_PROFILE_SCHEMA_VERSION,
  WizardInputV2,
  WizardInputV2Schema,
  WizardIntentProfileV1,
  WizardIntentProfileV1Schema,
} from '@shared/types/src'
import { createAgent } from '@/repositories/agent.repository'
import {
  AGENT_PROVISIONING_ORCHESTRATOR_JOB_NAME,
} from '@/services/provisioning-orchestrator.service'
import {
  createAgentProvisioningJob,
  createAgentProvisioningSteps,
  findAgentProvisioningJobByOrganizationAndId,
  findAgentProvisioningJobByOrganizationAndIdempotencyKey,
  listAgentProvisioningSteps,
  updateAgentProvisioningJob,
} from '@/repositories/provisioning.repository'

const WIZARD_STEP_IDS = AgentProvisioningStepIdSchema.options
const RECOVERABLE_JOB_STATUSES = new Set(['failed', 'blocked_manual'])

const toIso = (value: Date | string | null | undefined) => {
  if (!value) {
    return null
  }

  return new Date(value).toISOString()
}

const stableJsonStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJsonStringify(entry)).join(',')}]`
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([left], [right]) => left.localeCompare(right),
  )
  return `{${entries
    .map(
      ([key, entry]) => `${JSON.stringify(key)}:${stableJsonStringify(entry)}`,
    )
    .join(',')}}`
}

const resolveKnowledgeSourceType = (source: string): 'url' | 'doc' => {
  try {
    const withProtocol = /^https?:\/\//i.test(source)
      ? source
      : `https://${source}`
    new URL(withProtocol)
    return 'url'
  } catch {
    return 'doc'
  }
}

const normalizeWizardInput = (
  payload: CreateElevenLabsAgentRequest,
): WizardInputV2 => {
  return WizardInputV2Schema.parse(payload.wizard_input_v2)
}

const buildWizardIntentProfile = (wizardInput: WizardInputV2) => {
  const profile: WizardIntentProfileV1 = {
    normalizedBusinessContext: {
      agentName: wizardInput.agentName,
      industry: wizardInput.industry,
      useCase: wizardInput.useCase,
      mainObjective: wizardInput.mainObjective,
    },
    selectedServices: wizardInput.services,
    selectedQuestions: wizardInput.discoveryQuestions || [],
    routingRules: {
      transferNumber: wizardInput.routing?.transferNumber || null,
      businessTimezone: wizardInput.routing?.businessTimezone || null,
      languages: wizardInput.routing?.languages || [],
    },
    knowledgeSourceManifest: (wizardInput.knowledgeSources || []).map(
      (source) => ({
        source,
        sourceType: resolveKnowledgeSourceType(source),
      }),
    ),
    selectedVoice: {
      voiceId: wizardInput.voiceSelection?.voiceId || null,
      fallbackCandidate: wizardInput.voiceSelection?.voiceId || null,
    },
    inputSchemaVersion: WIZARD_INPUT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
  }

  return WizardIntentProfileV1Schema.parse(profile)
}

const buildProfileHash = (profile: WizardIntentProfileV1) => {
  return createHash('sha256')
    .update(stableJsonStringify(profile))
    .digest('hex')
}

const normalizeIdempotencyKey = (
  value: string | undefined,
  fallbackPrefix: string,
) => {
  const normalized = value?.trim()
  if (normalized) {
    return normalized
  }
  return `${fallbackPrefix}:${randomUUID()}`
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  return 'Unknown provisioning orchestration error'
}

const enqueueWizardProvisioningOrchestration = async (input: {
  jobId: string
  organizationId: string
  agentId: string
  correlationId: string
  idempotencyKey: string
  attempt: number
}) => {
  return enqueueQueueJob(
    QUEUE_NAMES.INTEGRATION_SYNC,
    AGENT_PROVISIONING_ORCHESTRATOR_JOB_NAME,
    {
      provisioningJobId: input.jobId,
      organizationId: input.organizationId,
      agentId: input.agentId,
      correlationId: input.correlationId,
      idempotencyKey: `${input.idempotencyKey}:attempt:${input.attempt}`,
    },
    {
      jobId: `agent-provisioning:${input.jobId}:attempt:${input.attempt}`,
    },
  )
}

const toJobView = (job: {
  id: string
  organizationId: string
  agentId: string
  correlationId: string
  idempotencyKey: string
  status: string
  attempt: number
  lastErrorCode: string | null
  lastErrorMessage: string | null
  createdAt: Date | string
  startedAt: Date | string | null
  completedAt: Date | string | null
  updatedAt: Date | string
}) => {
  return {
    id: job.id,
    organizationId: job.organizationId,
    agentId: job.agentId,
    correlationId: job.correlationId,
    idempotencyKey: job.idempotencyKey,
    status: AgentProvisioningJobStatusSchema.parse(job.status),
    attempt: job.attempt,
    lastErrorCode: job.lastErrorCode,
    lastErrorMessage: job.lastErrorMessage,
    createdAt: toIso(job.createdAt) || new Date().toISOString(),
    startedAt: toIso(job.startedAt),
    completedAt: toIso(job.completedAt),
    updatedAt: toIso(job.updatedAt) || new Date().toISOString(),
  }
}

const toStepView = (step: {
  id: string
  jobId: string
  organizationId: string
  agentId: string
  stepId: string
  stepOrder: number
  status: string
  attempt: number
  lastErrorCode: string | null
  lastErrorMessage: string | null
  createdAt: Date | string
  startedAt: Date | string | null
  completedAt: Date | string | null
  updatedAt: Date | string
}) => {
  return {
    id: step.id,
    jobId: step.jobId,
    organizationId: step.organizationId,
    agentId: step.agentId,
    stepId: AgentProvisioningStepIdSchema.parse(step.stepId),
    stepOrder: step.stepOrder,
    status: AgentProvisioningStepStatusSchema.parse(step.status),
    attempt: step.attempt,
    lastErrorCode: step.lastErrorCode,
    lastErrorMessage: step.lastErrorMessage,
    createdAt: toIso(step.createdAt) || new Date().toISOString(),
    startedAt: toIso(step.startedAt),
    completedAt: toIso(step.completedAt),
    updatedAt: toIso(step.updatedAt) || new Date().toISOString(),
  }
}

const createPendingSteps = (input: {
  jobId: string
  organizationId: string
  agentId: string
  correlationId: string
}) => {
  const now = new Date()
  return WIZARD_STEP_IDS.map((stepId, index) => ({
    jobId: input.jobId,
    organizationId: input.organizationId,
    agentId: input.agentId,
    stepId,
    stepOrder: index + 1,
    status: 'pending',
    attempt: 1,
    correlationId: input.correlationId,
    lastErrorCode: null,
    lastErrorMessage: null,
    eventLog: null,
    metadata: null,
    updatedAt: now,
  }))
}

export class AgentProvisioningContractError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export const startWizardProvisioningContract = async (input: {
  organizationId: string
  requestPayload: CreateElevenLabsAgentRequest
  requestedByUserId: string
  correlationId: string
  idempotencyKey?: string
}) => {
  const wizardInput = normalizeWizardInput(input.requestPayload)
  const intentProfile = buildWizardIntentProfile(wizardInput)
  const profileHash = buildProfileHash(intentProfile)
  const idempotencyKey = normalizeIdempotencyKey(
    input.idempotencyKey || input.requestPayload.idempotencyKey,
    `wizard-start:${input.organizationId}`,
  )

  const existing =
    await findAgentProvisioningJobByOrganizationAndIdempotencyKey(
      input.organizationId,
      idempotencyKey,
    )

  if (existing) {
    const existingSteps = await listAgentProvisioningSteps(existing.id)
    return {
      job: toJobView(existing),
      steps: existingSteps.map(toStepView),
      agentId: existing.agentId,
      idempotentReplay: true,
    }
  }

  const agent = await createAgent({
    name: wizardInput.agentName,
    slug: formatToSlug(wizardInput.agentName),
    organizationId: input.organizationId,
    phoneNumber: '+15555550123',
    redirectNumber: '+15555550123',
    externalId: `wizard-v2:${randomUUID()}`,
    externalType: AgentExternalType.LOCAL_FALLBACK,
    industry: wizardInput.industry,
    useCase: wizardInput.useCase,
    website: null,
    mainGoal: wizardInput.mainObjective,
    voiceId: wizardInput.voiceSelection?.voiceId || null,
    status: 'draft',
    syncPending: true,
    lastSyncAt: null,
    lastSyncError: 'Provisioning queued via wizard_v2 contract.',
    providerCorrelationKey: input.correlationId,
    promptProfileVersion: WIZARD_INTENT_PROFILE_SCHEMA_VERSION,
    configProfileVersion: WIZARD_INPUT_SCHEMA_VERSION,
    profileHash,
    wizardIntentProfile: intentProfile,
    readinessStatus: 'blocked',
  })

  const job = await createAgentProvisioningJob({
    organizationId: input.organizationId,
    agentId: agent.id,
    requestedByUserId: input.requestedByUserId,
    correlationId: input.correlationId,
    idempotencyKey,
    status: 'queued',
    attempt: 1,
    lastErrorCode: null,
    lastErrorMessage: null,
    wizardInput,
    intentProfile,
    runtimeState: null,
    updatedAt: new Date(),
  })

  const steps = await createAgentProvisioningSteps(
    createPendingSteps({
      jobId: job.id,
      organizationId: input.organizationId,
      agentId: agent.id,
      correlationId: input.correlationId,
    }),
  )

  try {
    await enqueueWizardProvisioningOrchestration({
      jobId: job.id,
      organizationId: input.organizationId,
      agentId: agent.id,
      correlationId: input.correlationId,
      idempotencyKey,
      attempt: job.attempt,
    })
  } catch (error) {
    const errorMessage = getErrorMessage(error)

    await updateAgentProvisioningJob(job.id, {
      status: 'failed',
      lastErrorCode: 'PROVISIONING_ENQUEUE_FAILED',
      lastErrorMessage: errorMessage,
      completedAt: new Date(),
    })

    throw new AgentProvisioningContractError(
      500,
      'AGENT_PROVISIONING_ENQUEUE_FAILED',
      errorMessage,
      {
        jobId: job.id,
      },
    )
  }

  return {
    job: toJobView(job),
    steps: steps.map(toStepView),
    agentId: agent.id,
    idempotentReplay: false,
  }
}

export const getWizardProvisioningContractStatus = async (input: {
  organizationId: string
  jobId: string
}) => {
  const job = await findAgentProvisioningJobByOrganizationAndId(
    input.organizationId,
    input.jobId,
  )
  if (!job) {
    throw new AgentProvisioningContractError(
      404,
      'AGENT_PROVISIONING_JOB_NOT_FOUND',
      `Provisioning job ${input.jobId} was not found`,
      {
        jobId: input.jobId,
      },
    )
  }

  const steps = await listAgentProvisioningSteps(job.id)

  return {
    job: toJobView(job),
    steps: steps.map(toStepView),
  }
}

export const retryWizardProvisioningContract = async (input: {
  organizationId: string
  jobId: string
  requestedByUserId: string
  correlationId: string
  idempotencyKey?: string
}) => {
  const sourceJob = await findAgentProvisioningJobByOrganizationAndId(
    input.organizationId,
    input.jobId,
  )

  if (!sourceJob) {
    throw new AgentProvisioningContractError(
      404,
      'AGENT_PROVISIONING_JOB_NOT_FOUND',
      `Provisioning job ${input.jobId} was not found`,
      {
        jobId: input.jobId,
      },
    )
  }

  if (!RECOVERABLE_JOB_STATUSES.has(sourceJob.status)) {
    throw new AgentProvisioningContractError(
      409,
      'AGENT_PROVISIONING_JOB_NOT_RECOVERABLE',
      `Provisioning job ${input.jobId} is not in a recoverable state`,
      {
        currentStatus: sourceJob.status,
        recoverableStatuses: Array.from(RECOVERABLE_JOB_STATUSES),
      },
    )
  }

  const idempotencyKey = normalizeIdempotencyKey(
    input.idempotencyKey,
    `wizard-retry:${input.organizationId}:${sourceJob.id}`,
  )

  const existing =
    await findAgentProvisioningJobByOrganizationAndIdempotencyKey(
      input.organizationId,
      idempotencyKey,
    )

  if (existing) {
    const existingSteps = await listAgentProvisioningSteps(existing.id)
    return {
      job: toJobView(existing),
      steps: existingSteps.map(toStepView),
      agentId: existing.agentId,
      idempotentReplay: true,
    }
  }

  const nextAttempt = sourceJob.attempt + 1
  const retryCorrelationId = `${sourceJob.correlationId}:retry:${nextAttempt}`

  const job = await createAgentProvisioningJob({
    organizationId: sourceJob.organizationId,
    agentId: sourceJob.agentId,
    requestedByUserId: input.requestedByUserId,
    correlationId: retryCorrelationId,
    idempotencyKey,
    status: 'retrying',
    attempt: nextAttempt,
    lastErrorCode: sourceJob.lastErrorCode,
    lastErrorMessage: sourceJob.lastErrorMessage,
    wizardInput: sourceJob.wizardInput,
    intentProfile: sourceJob.intentProfile,
    runtimeState: {
      retryOfJobId: sourceJob.id,
      reason: 'manual_retry',
      requestedAt: new Date().toISOString(),
      requestedByUserId: input.requestedByUserId,
    },
    updatedAt: new Date(),
  })

  const steps = await createAgentProvisioningSteps(
    createPendingSteps({
      jobId: job.id,
      organizationId: sourceJob.organizationId,
      agentId: sourceJob.agentId,
      correlationId: retryCorrelationId,
    }),
  )

  try {
    await enqueueWizardProvisioningOrchestration({
      jobId: job.id,
      organizationId: sourceJob.organizationId,
      agentId: sourceJob.agentId,
      correlationId: retryCorrelationId,
      idempotencyKey,
      attempt: job.attempt,
    })
  } catch (error) {
    const errorMessage = getErrorMessage(error)

    await updateAgentProvisioningJob(job.id, {
      status: 'failed',
      lastErrorCode: 'PROVISIONING_ENQUEUE_FAILED',
      lastErrorMessage: errorMessage,
      completedAt: new Date(),
    })

    throw new AgentProvisioningContractError(
      500,
      'AGENT_PROVISIONING_ENQUEUE_FAILED',
      errorMessage,
      {
        jobId: job.id,
      },
    )
  }

  return {
    job: toJobView(job),
    steps: steps.map(toStepView),
    agentId: sourceJob.agentId,
    idempotentReplay: false,
  }
}
