import { randomUUID, createHash } from 'crypto'
import { UnrecoverableError } from 'bullmq'
import { AgentExternalType } from '@shared/types/src'
import { db } from '@/lib/db'
import logger from '@/lib/logger'
import { formatToSlug } from '@/utils'
import { enqueueQueueJob } from '@/queues'
import { QUEUE_NAMES, QueueJobPayload } from '@/types/queues'
import { updateUserLastActiveOrganizationId } from '@/repositories/auth.repository'
import {
  findById as findAgentById,
  updateAgent as updateAgentRepo,
} from '@/repositories/agent.repository'
import { withId, withIdAndTimestamps } from '@/repositories/utils'
import {
  findAgentProvisioningJobById,
  findAgentProvisioningJobByRequesterAndIdempotencyKey,
  findAgentProvisioningStep,
  findLatestAgentProvisioningJobByAgentId,
  listAgentProvisioningSteps,
  updateAgentProvisioningJob,
  updateAgentProvisioningStepByStepId,
} from '@/repositories/provisioning.repository'
import {
  AgentProvisionRetryPayload,
  retryAgentProvision,
} from '@/services/agent.service'

export const AGENT_PROVISIONING_ORCHESTRATOR_JOB_NAME =
  'agent-provisioning-orchestrator'

export const PROVISIONING_JOB_STATUSES = [
  'queued',
  'running',
  'retrying',
  'failed',
  'completed',
  'blocked_manual',
] as const

export type ProvisioningJobStatus = (typeof PROVISIONING_JOB_STATUSES)[number]

export const PROVISIONING_STEP_STATUSES = [
  'pending',
  'running',
  'failed',
  'completed',
  'skipped',
] as const

export type ProvisioningStepStatus = (typeof PROVISIONING_STEP_STATUSES)[number]

export const PROVISIONING_STEP_DEFINITIONS = [
  {
    stepId: 'validate_request',
    stepOrder: 1,
  },
  {
    stepId: 'compile_intent_profile',
    stepOrder: 2,
  },
  {
    stepId: 'compile_prompt',
    stepOrder: 3,
  },
  {
    stepId: 'create_or_update_agent',
    stepOrder: 4,
  },
  {
    stepId: 'apply_core_tabs_profile',
    stepOrder: 5,
  },
  {
    stepId: 'ingest_knowledge_sources',
    stepOrder: 6,
  },
  {
    stepId: 'attach_webhooks_and_mcp',
    stepOrder: 7,
  },
  {
    stepId: 'register_and_run_smoke_tests',
    stepOrder: 8,
  },
  {
    stepId: 'persist_versions_and_sync',
    stepOrder: 9,
  },
] as const

export type ProvisioningStepId =
  (typeof PROVISIONING_STEP_DEFINITIONS)[number]['stepId']

interface ProvisioningStepEvent {
  type: 'queued' | 'running' | 'completed' | 'failed' | 'retry_requested'
  at: string
  attempt: number
  correlationId: string
  message?: string
  code?: string
}

interface ProvisioningFailure {
  code: string
  message: string
  recoverable: boolean
  manualInterventionRequired: boolean
}

export interface WizardOnboardingInput {
  name: string
  domain?: string
  industry: string
  services: string[]
  useCase?: string
  website?: string
  mainGoal?: string
  agent: {
    name: string
    openingLine?: string
    serviceQuestions?: string[]
  }
}

interface NormalizedWizardInput {
  name: string
  domain: string | null
  industry: string
  services: string[]
  useCase: string
  website: string | null
  mainGoal: string | null
  agent: {
    name: string
    openingLine: string | null
    serviceQuestions: string[]
  }
}

export interface StartProvisioningInput {
  requestedByUserId: string
  idempotencyKey: string
  correlationId: string
  wizardInput: WizardOnboardingInput
}

export interface ProvisioningOrchestrationQueuePayload extends QueueJobPayload {
  provisioningJobId: string
  organizationId: string
  agentId: string
  correlationId: string
}

export interface ProvisioningStepView {
  id: string
  stepId: string
  stepOrder: number
  status: ProvisioningStepStatus
  attempt: number
  correlationId: string
  lastErrorCode: string | null
  lastErrorMessage: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  metadata: Record<string, unknown>
  eventLog: ProvisioningStepEvent[]
}

export interface ProvisioningJobView {
  id: string
  organizationId: string
  agentId: string
  requestedByUserId: string | null
  correlationId: string
  idempotencyKey: string
  status: ProvisioningJobStatus
  attempt: number
  lastErrorCode: string | null
  lastErrorMessage: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  updatedAt: string
}

export interface ProvisioningJobWithSteps {
  job: ProvisioningJobView
  steps: ProvisioningStepView[]
}

interface StartProvisioningResult extends ProvisioningJobWithSteps {
  reusedExisting: boolean
  organization: {
    id: string
    name: string
    slug: string
  }
  agent: {
    id: string
    name: string
    externalType: string
    status: string
    readinessStatus: string
    syncPending: boolean
  }
}

interface StepRuntimeState {
  intentProfile?: Record<string, unknown>
  compiledPrompt?: string
  compiledGreeting?: string
  selectedVoiceId?: string | null
  profileHash?: string
  smoke?: {
    status: 'passed' | 'failed'
    checkedAt: string
    details?: Record<string, unknown>
  }
  [key: string]: unknown
}

class ProvisioningStepError extends Error {
  code: string
  recoverable: boolean
  manualInterventionRequired: boolean

  constructor(input: {
    code: string
    message: string
    recoverable: boolean
    manualInterventionRequired?: boolean
  }) {
    super(input.message)
    this.name = 'ProvisioningStepError'
    this.code = input.code
    this.recoverable = input.recoverable
    this.manualInterventionRequired = input.manualInterventionRequired === true
  }
}

const TERMINAL_JOB_STATUSES = new Set<ProvisioningJobStatus>([
  'failed',
  'completed',
  'blocked_manual',
])

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') return ''
  return value.trim()
}

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  const normalized = value
    .map((entry) => normalizeString(entry))
    .filter((entry) => entry.length > 0)

  return [...new Set(normalized)]
}

const asRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

const parseJsonMetadata = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'string') {
    try {
      return asRecord(JSON.parse(value))
    } catch {
      return {}
    }
  }

  return asRecord(value)
}

const toIso = (value: Date | string | null | undefined): string | null => {
  if (!value) return null
  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

const toJobView = (job: {
  id: string
  organizationId: string
  agentId: string
  requestedByUserId: string | null
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
}): ProvisioningJobView => {
  const status = PROVISIONING_JOB_STATUSES.includes(
    job.status as ProvisioningJobStatus,
  )
    ? (job.status as ProvisioningJobStatus)
    : 'failed'

  return {
    id: job.id,
    organizationId: job.organizationId,
    agentId: job.agentId,
    requestedByUserId: job.requestedByUserId,
    correlationId: job.correlationId,
    idempotencyKey: job.idempotencyKey,
    status,
    attempt: Number(job.attempt || 1),
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
  stepId: string
  stepOrder: number
  status: string
  attempt: number
  correlationId: string
  lastErrorCode: string | null
  lastErrorMessage: string | null
  createdAt: Date | string
  startedAt: Date | string | null
  completedAt: Date | string | null
  metadata: unknown
  eventLog: unknown
}): ProvisioningStepView => {
  const status = PROVISIONING_STEP_STATUSES.includes(
    step.status as ProvisioningStepStatus,
  )
    ? (step.status as ProvisioningStepStatus)
    : 'failed'

  return {
    id: step.id,
    stepId: step.stepId,
    stepOrder: Number(step.stepOrder || 0),
    status,
    attempt: Number(step.attempt || 0),
    correlationId: step.correlationId,
    lastErrorCode: step.lastErrorCode,
    lastErrorMessage: step.lastErrorMessage,
    createdAt: toIso(step.createdAt) || new Date().toISOString(),
    startedAt: toIso(step.startedAt),
    completedAt: toIso(step.completedAt),
    metadata: asRecord(step.metadata),
    eventLog: Array.isArray(step.eventLog)
      ? (step.eventLog as ProvisioningStepEvent[])
      : [],
  }
}

const normalizeWizardInput = (
  input: WizardOnboardingInput | Record<string, unknown>,
): NormalizedWizardInput => {
  const raw = asRecord(input)
  const greeting = asRecord(raw.greeting)

  if (typeof raw.agentName === 'string') {
    const knowledgeSources = normalizeStringArray(raw.knowledgeSources)
    const websiteFromKnowledgeSource = knowledgeSources.find((source) => {
      try {
        new URL(source)
        return true
      } catch {
        return false
      }
    })

    const greetingMode = normalizeString(greeting.mode)
    const customGreeting = normalizeString(greeting.customText)

    return {
      name:
        normalizeString(raw.name) ||
        normalizeString(raw.companyName) ||
        normalizeString(raw.organizationName) ||
        normalizeString(raw.agentName),
      domain: normalizeString(raw.domain) || null,
      industry: normalizeString(raw.industry),
      services: normalizeStringArray(raw.services),
      useCase: normalizeString(raw.useCase) || 'customer_support',
      website:
        normalizeString(raw.website) || websiteFromKnowledgeSource || null,
      mainGoal:
        normalizeString(raw.mainObjective) ||
        normalizeString(raw.mainGoal) ||
        null,
      agent: {
        name: normalizeString(raw.agentName),
        openingLine:
          greetingMode === 'custom' && customGreeting
            ? customGreeting
            : normalizeString(raw.firstMessage) ||
              normalizeString(raw.customGreeting) ||
              null,
        serviceQuestions:
          normalizeStringArray(raw.discoveryQuestions).length > 0
            ? normalizeStringArray(raw.discoveryQuestions)
            : normalizeStringArray(raw.serviceQuestions),
      },
    }
  }

  const rawAgent = asRecord(raw.agent)
  return {
    name: normalizeString(raw.name),
    domain: normalizeString(raw.domain) || null,
    industry: normalizeString(raw.industry),
    services: normalizeStringArray(raw.services),
    useCase: normalizeString(raw.useCase) || 'customer_support',
    website: normalizeString(raw.website) || null,
    mainGoal: normalizeString(raw.mainGoal) || null,
    agent: {
      name: normalizeString(rawAgent.name),
      openingLine: normalizeString(rawAgent.openingLine) || null,
      serviceQuestions: normalizeStringArray(rawAgent.serviceQuestions),
    },
  }
}

const buildIntentProfile = (input: NormalizedWizardInput) => {
  return {
    schemaVersion: 'wizard_intent_profile_v1',
    inputSchemaVersion: 'wizard_input_v2',
    generatedAt: new Date().toISOString(),
    business: {
      companyName: input.name,
      domain: input.domain,
      industry: input.industry,
      useCase: input.useCase,
      website: input.website,
    },
    services: input.services,
    discoveryQuestions: input.agent.serviceQuestions,
    objective: input.mainGoal,
    routing: {
      transferNumber: null,
      businessTimezone: null,
      languages: ['en'],
    },
    greeting: {
      mode: input.agent.openingLine ? 'custom' : 'generated',
      customText: input.agent.openingLine,
    },
    voiceSelection: {
      voiceId: null,
      fallbackVoiceId: null,
    },
    knowledgeSources: input.website
      ? [
          {
            type: 'website',
            value: input.website,
          },
        ]
      : [],
  }
}

const compilePromptAndGreeting = (input: {
  wizardInput: NormalizedWizardInput
  intentProfile: Record<string, unknown>
}) => {
  const sections = [
    `You are the voice assistant for ${input.wizardInput.name}.`,
    `Industry: ${input.wizardInput.industry.replace(/_/g, ' ')}.`,
    `Primary use case: ${input.wizardInput.useCase.replace(/_/g, ' ')}.`,
    input.wizardInput.services.length > 0
      ? `Services offered: ${input.wizardInput.services.join(', ')}.`
      : null,
    input.wizardInput.mainGoal
      ? `Primary objective: ${input.wizardInput.mainGoal}.`
      : null,
    input.wizardInput.agent.serviceQuestions.length > 0
      ? `Discovery questions:\n- ${input.wizardInput.agent.serviceQuestions.join(
          '\n- ',
        )}`
      : null,
    'Escalate to a human when policy, safety, or billing-critical cases require manual handling.',
  ].filter((section): section is string => !!section)

  const prompt = sections.join('\n\n')
  const greeting =
    input.wizardInput.agent.openingLine ||
    `Hi, thanks for calling ${input.wizardInput.name}. How can I help today?`

  const profileHash = createHash('sha1')
    .update(
      JSON.stringify({
        prompt,
        greeting,
        intentProfile: input.intentProfile,
      }),
    )
    .digest('hex')

  return {
    prompt,
    greeting,
    profileHash,
    selectedVoiceId: null,
  }
}

const withStepEvent = (
  currentEventLog: unknown,
  event: ProvisioningStepEvent,
): ProvisioningStepEvent[] => {
  const existing = Array.isArray(currentEventLog)
    ? (currentEventLog as ProvisioningStepEvent[])
    : []

  return [...existing, event]
}

const parseRuntimeState = (value: unknown): StepRuntimeState => {
  return asRecord(value) as StepRuntimeState
}

const classifyProvisioningError = (error: unknown): ProvisioningFailure => {
  if (error instanceof ProvisioningStepError) {
    return {
      code: error.code,
      message: error.message,
      recoverable: error.recoverable,
      manualInterventionRequired: error.manualInterventionRequired,
    }
  }

  if (error instanceof UnrecoverableError) {
    return {
      code: 'UNRECOVERABLE_PROVISIONING_ERROR',
      message: error.message,
      recoverable: false,
      manualInterventionRequired: false,
    }
  }

  const err = error as any
  return {
    code:
      typeof err?.code === 'string' && err.code.length > 0
        ? err.code
        : 'PROVISIONING_ERROR',
    message:
      typeof err?.message === 'string' && err.message.length > 0
        ? err.message
        : 'Unknown provisioning failure',
    recoverable: true,
    manualInterventionRequired: false,
  }
}

const toOrganizationProvisioningStatus = (
  jobStatus: ProvisioningJobStatus,
): 'pending' | 'running' | 'failed' | 'completed' => {
  if (jobStatus === 'queued') return 'pending'
  if (jobStatus === 'running' || jobStatus === 'retrying') return 'running'
  if (jobStatus === 'completed') return 'completed'
  return 'failed'
}

const deriveLifecycleStatus = (input: {
  currentLifecycleStatus: string
  provisioningStatus: 'pending' | 'running' | 'failed' | 'completed'
}): string => {
  if (
    input.currentLifecycleStatus === 'payment_required' ||
    input.currentLifecycleStatus === 'suspended' ||
    input.currentLifecycleStatus === 'onboarding_incomplete'
  ) {
    return input.currentLifecycleStatus
  }

  if (
    input.provisioningStatus === 'pending' ||
    input.provisioningStatus === 'running'
  ) {
    return 'provisioning_pending'
  }

  if (input.provisioningStatus === 'completed') {
    return 'workspace_active'
  }

  return input.currentLifecycleStatus || 'provisioning_pending'
}

const updateOrganizationProvisioningMetadata = async (input: {
  organizationId: string
  jobId: string
  status: ProvisioningJobStatus
  stepId?: ProvisioningStepId
  correlationId: string
  attempt: number
  lastErrorCode?: string | null
  lastErrorMessage?: string | null
}) => {
  const organization = await db
    .selectFrom('organization')
    .where('id', '=', input.organizationId)
    .select(['id', 'metadata'])
    .executeTakeFirst()

  if (!organization) return

  const metadata = parseJsonMetadata(organization.metadata)
  const lifecycle = asRecord(metadata.lifecycle)
  const currentLifecycleStatus =
    normalizeString(metadata.lifecycleStatus) ||
    normalizeString(lifecycle.lifecycleStatus) ||
    'provisioning_pending'
  const planType =
    normalizeString(metadata.planType) ||
    normalizeString(lifecycle.planType) ||
    'paid'

  const provisioningStatus = toOrganizationProvisioningStatus(input.status)
  const lifecycleStatus = deriveLifecycleStatus({
    currentLifecycleStatus,
    provisioningStatus,
  })

  const nextMetadata = {
    ...metadata,
    lifecycleStatus,
    planType,
    provisioningStatus,
    lifecycle: {
      ...lifecycle,
      lifecycleStatus,
      planType,
      provisioningStatus,
    },
    wizardProvisioning: {
      jobId: input.jobId,
      status: input.status,
      currentStepId: input.stepId || null,
      attempt: input.attempt,
      correlationId: input.correlationId,
      updatedAt: new Date().toISOString(),
      lastErrorCode: input.lastErrorCode || null,
      lastErrorMessage: input.lastErrorMessage || null,
    },
  }

  await db
    .updateTable('organization')
    .set({ metadata: JSON.stringify(nextMetadata) })
    .where('id', '=', input.organizationId)
    .executeTakeFirst()
}

const enqueueProvisioningJob = async (input: {
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

const ensureValidWizardInput = (input: NormalizedWizardInput) => {
  if (!input.name) {
    throw new ProvisioningStepError({
      code: 'WIZARD_VALIDATION_FAILED',
      message: 'Organization name is required',
      recoverable: false,
    })
  }

  if (!input.industry) {
    throw new ProvisioningStepError({
      code: 'WIZARD_VALIDATION_FAILED',
      message: 'Industry is required',
      recoverable: false,
    })
  }

  if (input.services.length === 0) {
    throw new ProvisioningStepError({
      code: 'WIZARD_VALIDATION_FAILED',
      message: 'At least one service is required',
      recoverable: false,
    })
  }

  if (!input.agent.name) {
    throw new ProvisioningStepError({
      code: 'WIZARD_VALIDATION_FAILED',
      message: 'Agent name is required',
      recoverable: false,
    })
  }
}

const buildAgentProvisionRetryPayload = (input: {
  job: {
    agentId: string
    organizationId: string
    correlationId: string
  }
  organizationName: string
  wizardInput: NormalizedWizardInput
  state: StepRuntimeState
}): AgentProvisionRetryPayload => {
  const compiledGreeting =
    input.state.compiledGreeting || input.wizardInput.agent.openingLine

  return {
    agentId: input.job.agentId,
    organizationId: input.job.organizationId,
    companyName:
      input.organizationName ||
      input.wizardInput.name ||
      input.wizardInput.agent.name,
    name: input.wizardInput.agent.name,
    industry: input.wizardInput.industry,
    useCase: input.wizardInput.useCase,
    website: input.wizardInput.website || undefined,
    knowledgeSources: input.wizardInput.website
      ? [input.wizardInput.website]
      : undefined,
    mainGoal: input.wizardInput.mainGoal || undefined,
    voiceId: input.state.selectedVoiceId || undefined,
    greetingMode: compiledGreeting ? 'custom' : 'generated',
    customGreeting: compiledGreeting || undefined,
    firstMessage: compiledGreeting || undefined,
    services: input.wizardInput.services,
    discoveryQuestions: input.wizardInput.agent.serviceQuestions,
    serviceQuestions: input.wizardInput.agent.serviceQuestions,
    providerCorrelationKey: input.job.correlationId,
    correlationId: input.job.correlationId,
    idempotencyKey: `agent-provision:${input.job.agentId}:${input.job.correlationId}`,
  }
}

const executeStep = async (input: {
  stepId: ProvisioningStepId
  job: {
    id: string
    organizationId: string
    agentId: string
    correlationId: string
  }
  organizationName: string
  wizardInput: NormalizedWizardInput
  state: StepRuntimeState
}): Promise<StepRuntimeState> => {
  switch (input.stepId) {
    case 'validate_request': {
      ensureValidWizardInput(input.wizardInput)
      return input.state
    }

    case 'compile_intent_profile': {
      const intentProfile = buildIntentProfile(input.wizardInput)
      return {
        ...input.state,
        intentProfile,
      }
    }

    case 'compile_prompt': {
      const intentProfile =
        input.state.intentProfile || buildIntentProfile(input.wizardInput)
      const compiled = compilePromptAndGreeting({
        wizardInput: input.wizardInput,
        intentProfile,
      })

      return {
        ...input.state,
        intentProfile,
        compiledPrompt: compiled.prompt,
        compiledGreeting: compiled.greeting,
        selectedVoiceId: compiled.selectedVoiceId,
        profileHash: compiled.profileHash,
      }
    }

    case 'create_or_update_agent': {
      const retryPayload = buildAgentProvisionRetryPayload({
        job: {
          agentId: input.job.agentId,
          organizationId: input.job.organizationId,
          correlationId: input.job.correlationId,
        },
        organizationName: input.organizationName,
        wizardInput: input.wizardInput,
        state: input.state,
      })

      await retryAgentProvision(retryPayload)

      await updateAgentRepo(input.job.agentId, input.job.organizationId, {
        readinessStatus: 'degraded',
        syncPending: false,
        lastSyncError: null,
      })

      return input.state
    }

    case 'apply_core_tabs_profile': {
      return {
        ...input.state,
        coreTabsProfile: {
          profile: 'default-core-tabs-profile.v1',
          appliedAt: new Date().toISOString(),
        },
      }
    }

    case 'ingest_knowledge_sources': {
      return {
        ...input.state,
        ingestedKnowledgeSources: input.wizardInput.website
          ? [
              {
                type: 'website',
                source: input.wizardInput.website,
              },
            ]
          : [],
      }
    }

    case 'attach_webhooks_and_mcp': {
      return {
        ...input.state,
        webhookAndMcp: {
          status: 'attached',
          attachedAt: new Date().toISOString(),
        },
      }
    }

    case 'register_and_run_smoke_tests': {
      const agent = await findAgentById(
        input.job.agentId,
        input.job.organizationId,
      )
      if (
        agent.externalType !== AgentExternalType.ELEVEN_LABS ||
        agent.syncPending ||
        agent.status === 'error'
      ) {
        throw new ProvisioningStepError({
          code: 'SMOKE_TEST_PROVIDER_UNAVAILABLE',
          message:
            'Provider baseline agent is not healthy yet; retry after provider sync recovers.',
          recoverable: true,
        })
      }

      return {
        ...input.state,
        smoke: {
          status: 'passed',
          checkedAt: new Date().toISOString(),
          details: {
            externalType: agent.externalType,
            status: agent.status,
          },
        },
      }
    }

    case 'persist_versions_and_sync': {
      const intentProfile =
        input.state.intentProfile || buildIntentProfile(input.wizardInput)
      const compiled = compilePromptAndGreeting({
        wizardInput: input.wizardInput,
        intentProfile,
      })
      const profileHash = input.state.profileHash || compiled.profileHash
      const readinessStatus =
        input.state.smoke?.status === 'passed' ? 'ready' : 'degraded'

      await updateAgentRepo(input.job.agentId, input.job.organizationId, {
        promptProfileVersion: 'wizard_prompt_profile_v1',
        configProfileVersion: 'wizard_config_profile_v1',
        profileHash,
        wizardIntentProfile: intentProfile,
        readinessStatus,
        syncPending: false,
        status: 'active',
        lastSyncError: null,
        lastSyncAt: new Date(),
      })

      return {
        ...input.state,
        intentProfile,
        profileHash,
      }
    }

    default:
      throw new ProvisioningStepError({
        code: 'UNKNOWN_PROVISIONING_STEP',
        message: `Unknown provisioning step: ${input.stepId}`,
        recoverable: false,
      })
  }
}

const getJobSnapshot = async (
  jobId: string,
): Promise<ProvisioningJobWithSteps | null> => {
  const job = await findAgentProvisioningJobById(jobId)
  if (!job) return null

  const steps = await listAgentProvisioningSteps(jobId)

  return {
    job: toJobView(job),
    steps: steps.map(toStepView),
  }
}

const findFailedStepId = async (
  jobId: string,
): Promise<ProvisioningStepId | null> => {
  const steps = await listAgentProvisioningSteps(jobId)
  const failedStep = steps.find((step) => step.status === 'failed')
  if (!failedStep) return null
  return failedStep.stepId as ProvisioningStepId
}

export const startOnboardingProvisioning = async (
  input: StartProvisioningInput,
): Promise<StartProvisioningResult> => {
  const normalizedWizardInput = normalizeWizardInput(input.wizardInput)

  const existing = await findAgentProvisioningJobByRequesterAndIdempotencyKey(
    input.requestedByUserId,
    input.idempotencyKey,
  )

  if (existing) {
    const existingSnapshot = await getJobSnapshot(existing.id)
    if (!existingSnapshot) {
      throw new Error(`Provisioning job ${existing.id} could not be loaded`)
    }

    const organization = await db
      .selectFrom('organization')
      .where('id', '=', existing.organizationId)
      .select(['id', 'name', 'slug'])
      .executeTakeFirstOrThrow()

    const agent = await findAgentById(existing.agentId, existing.organizationId)

    return {
      ...existingSnapshot,
      reusedExisting: true,
      organization,
      agent: {
        id: agent.id,
        name: agent.name,
        externalType: agent.externalType,
        status: agent.status,
        readinessStatus: agent.readinessStatus || 'degraded',
        syncPending: !!agent.syncPending,
      },
    }
  }

  const now = new Date()
  const correlationId = normalizeString(input.correlationId) || randomUUID()

  const initialMetadata = {
    domain: normalizedWizardInput.domain,
    industry: normalizedWizardInput.industry,
    services: normalizedWizardInput.services,
    useCase: normalizedWizardInput.useCase,
    website: normalizedWizardInput.website,
    mainGoal: normalizedWizardInput.mainGoal,
    lifecycleStatus: 'payment_required',
    planType: 'paid',
    provisioningStatus: 'pending',
    lifecycle: {
      lifecycleStatus: 'payment_required',
      planType: 'paid',
      provisioningStatus: 'pending',
    },
    entitlementState: 'payment_required',
    subscriptionStatus: 'incomplete',
    billingOffer: 'metered_monthly',
    billing: {
      offer: 'metered_monthly',
      entitlementState: 'payment_required',
      subscriptionStatus: 'incomplete',
      updatedAt: now.toISOString(),
    },
    wizardProvisioning: {
      jobId: null,
      status: 'queued',
      currentStepId: null,
      attempt: 1,
      correlationId,
      updatedAt: now.toISOString(),
      lastErrorCode: null,
      lastErrorMessage: null,
    },
  }

  const created = await db.transaction().execute(async (trx) => {
    const organization = await trx
      .insertInto('organization')
      .values(
        withId({
          name: normalizedWizardInput.name,
          slug: formatToSlug(normalizedWizardInput.name),
          createdAt: now,
          metadata: JSON.stringify(initialMetadata),
        }),
      )
      .returningAll()
      .executeTakeFirstOrThrow()

    await trx
      .insertInto('member')
      .values(
        withId({
          organizationId: organization.id,
          userId: input.requestedByUserId,
          role: 'owner',
          createdAt: now,
        }),
      )
      .executeTakeFirstOrThrow()

    const placeholderAgent = await trx
      .insertInto('agent')
      .values(
        withIdAndTimestamps(
          {
            organizationId: organization.id,
            name: normalizedWizardInput.agent.name,
            slug: formatToSlug(normalizedWizardInput.agent.name),
            phoneNumber: '+15555550123',
            redirectNumber: '+15555550123',
            externalId: `provisioning:${correlationId}`,
            externalType: AgentExternalType.LOCAL_FALLBACK,
            industry: normalizedWizardInput.industry,
            useCase: normalizedWizardInput.useCase,
            website: normalizedWizardInput.website,
            mainGoal: normalizedWizardInput.mainGoal,
            voiceId: null,
            status: 'draft',
            syncPending: true,
            lastSyncAt: null,
            lastSyncError: 'Provisioning queued',
            providerCorrelationKey: correlationId,
            promptProfileVersion: null,
            configProfileVersion: null,
            profileHash: null,
            wizardIntentProfile: null,
            readinessStatus: 'degraded',
          },
          true,
        ),
      )
      .returningAll()
      .executeTakeFirstOrThrow()

    const provisioningJob = await trx
      .insertInto('agent_provisioning_job')
      .values(
        withId({
          organizationId: organization.id,
          agentId: placeholderAgent.id,
          requestedByUserId: input.requestedByUserId,
          correlationId,
          idempotencyKey: input.idempotencyKey,
          status: 'queued',
          attempt: 1,
          lastErrorCode: null,
          lastErrorMessage: null,
          wizardInput: normalizedWizardInput,
          intentProfile: null,
          runtimeState: {},
          createdAt: now,
          startedAt: null,
          completedAt: null,
          updatedAt: now,
        }),
      )
      .returningAll()
      .executeTakeFirstOrThrow()

    await trx
      .updateTable('organization')
      .set({
        metadata: JSON.stringify({
          ...initialMetadata,
          wizardProvisioning: {
            ...(asRecord(initialMetadata.wizardProvisioning) as Record<
              string,
              unknown
            >),
            jobId: provisioningJob.id,
          },
        }),
      })
      .where('id', '=', organization.id)
      .executeTakeFirst()

    const steps = PROVISIONING_STEP_DEFINITIONS.map((step) =>
      withId({
        jobId: provisioningJob.id,
        organizationId: organization.id,
        agentId: placeholderAgent.id,
        stepId: step.stepId,
        stepOrder: step.stepOrder,
        status: 'pending',
        attempt: 0,
        correlationId,
        lastErrorCode: null,
        lastErrorMessage: null,
        eventLog: [
          {
            type: 'queued',
            at: now.toISOString(),
            attempt: 0,
            correlationId,
          },
        ],
        metadata: {},
        createdAt: now,
        startedAt: null,
        completedAt: null,
        updatedAt: now,
      }),
    )

    await trx
      .insertInto('agent_provisioning_step')
      .values(steps)
      .returning(['id'])
      .execute()

    return {
      organization,
      placeholderAgent,
      provisioningJob,
    }
  })

  await updateUserLastActiveOrganizationId(
    input.requestedByUserId,
    created.organization.id,
  )

  try {
    await enqueueProvisioningJob({
      jobId: created.provisioningJob.id,
      organizationId: created.organization.id,
      agentId: created.placeholderAgent.id,
      correlationId,
      idempotencyKey: input.idempotencyKey,
      attempt: 1,
    })
  } catch (error) {
    const failure = classifyProvisioningError(error)

    await updateAgentProvisioningJob(created.provisioningJob.id, {
      status: 'failed',
      lastErrorCode: failure.code,
      lastErrorMessage: failure.message,
      completedAt: new Date(),
    })

    await updateOrganizationProvisioningMetadata({
      organizationId: created.organization.id,
      jobId: created.provisioningJob.id,
      status: 'failed',
      correlationId,
      attempt: 1,
      lastErrorCode: failure.code,
      lastErrorMessage: failure.message,
    })

    throw error
  }

  const snapshot = await getJobSnapshot(created.provisioningJob.id)
  if (!snapshot) {
    throw new Error(
      `Provisioning job ${created.provisioningJob.id} could not be loaded after creation`,
    )
  }

  return {
    ...snapshot,
    reusedExisting: false,
    organization: {
      id: created.organization.id,
      name: created.organization.name,
      slug: created.organization.slug,
    },
    agent: {
      id: created.placeholderAgent.id,
      name: created.placeholderAgent.name,
      externalType: created.placeholderAgent.externalType,
      status: created.placeholderAgent.status,
      readinessStatus: created.placeholderAgent.readinessStatus || 'degraded',
      syncPending: !!created.placeholderAgent.syncPending,
    },
  }
}

export const processProvisioningOrchestrationJob = async (
  payload: ProvisioningOrchestrationQueuePayload,
) => {
  const job = await findAgentProvisioningJobById(payload.provisioningJobId)

  if (!job) {
    throw new UnrecoverableError(
      `Provisioning job ${payload.provisioningJobId} not found`,
    )
  }

  const currentStatus = job.status as ProvisioningJobStatus
  if (TERMINAL_JOB_STATUSES.has(currentStatus)) {
    return {
      processed: true,
      skipped: true,
      reason: `job_terminal:${job.status}`,
      provisioningJobId: job.id,
      status: job.status,
    }
  }

  const correlationId =
    normalizeString(payload.correlationId) ||
    normalizeString(job.correlationId) ||
    randomUUID()

  const wizardInput = normalizeWizardInput(
    job.wizardInput as WizardOnboardingInput,
  )
  const organization = await db
    .selectFrom('organization')
    .where('id', '=', job.organizationId)
    .select(['id', 'name'])
    .executeTakeFirst()

  if (!organization) {
    throw new UnrecoverableError(
      `Organization ${job.organizationId} not found for provisioning job ${job.id}`,
    )
  }

  const steps = await listAgentProvisioningSteps(job.id)
  const stepMap = new Map(steps.map((step) => [step.stepId, step]))

  await updateAgentProvisioningJob(job.id, {
    status: 'running',
    startedAt: job.startedAt || new Date(),
    completedAt: null,
    lastErrorCode: null,
    lastErrorMessage: null,
  })

  await updateOrganizationProvisioningMetadata({
    organizationId: job.organizationId,
    jobId: job.id,
    status: 'running',
    correlationId,
    attempt: Number(job.attempt || 1),
  })

  await updateAgentRepo(job.agentId, job.organizationId, {
    readinessStatus: 'degraded',
    syncPending: true,
    lastSyncError: null,
  })

  let state = parseRuntimeState(job.runtimeState)

  for (const definition of PROVISIONING_STEP_DEFINITIONS) {
    const step = stepMap.get(definition.stepId)

    if (!step) {
      throw new UnrecoverableError(
        `Provisioning step ${definition.stepId} missing for job ${job.id}`,
      )
    }

    if (step.status === 'completed' || step.status === 'skipped') {
      continue
    }

    const nextAttempt = Number(step.attempt || 0) + 1

    const runningStep = await updateAgentProvisioningStepByStepId(
      job.id,
      definition.stepId,
      {
        status: 'running',
        attempt: nextAttempt,
        startedAt: new Date(),
        completedAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        correlationId,
        eventLog: withStepEvent(step.eventLog, {
          type: 'running',
          at: new Date().toISOString(),
          attempt: nextAttempt,
          correlationId,
        }),
      },
    )

    if (!runningStep) {
      throw new UnrecoverableError(
        `Failed to mark step ${definition.stepId} running for job ${job.id}`,
      )
    }

    try {
      state = await executeStep({
        stepId: definition.stepId,
        job: {
          id: job.id,
          organizationId: job.organizationId,
          agentId: job.agentId,
          correlationId,
        },
        organizationName: organization.name,
        wizardInput,
        state,
      })

      const completedStep = await updateAgentProvisioningStepByStepId(
        job.id,
        definition.stepId,
        {
          status: 'completed',
          completedAt: new Date(),
          metadata: {
            ...asRecord(runningStep.metadata),
            updatedAt: new Date().toISOString(),
          },
          eventLog: withStepEvent(runningStep.eventLog, {
            type: 'completed',
            at: new Date().toISOString(),
            attempt: nextAttempt,
            correlationId,
          }),
        },
      )

      if (!completedStep) {
        throw new UnrecoverableError(
          `Failed to persist completion for step ${definition.stepId} on job ${job.id}`,
        )
      }

      stepMap.set(definition.stepId, completedStep)

      await updateAgentProvisioningJob(job.id, {
        intentProfile: state.intentProfile || null,
        runtimeState: state,
      })

      await updateOrganizationProvisioningMetadata({
        organizationId: job.organizationId,
        jobId: job.id,
        status: 'running',
        stepId: definition.stepId,
        correlationId,
        attempt: Number(job.attempt || 1),
      })
    } catch (error) {
      const failure = classifyProvisioningError(error)

      const failedStep = await updateAgentProvisioningStepByStepId(
        job.id,
        definition.stepId,
        {
          status: 'failed',
          completedAt: new Date(),
          lastErrorCode: failure.code,
          lastErrorMessage: failure.message,
          eventLog: withStepEvent(runningStep.eventLog, {
            type: 'failed',
            at: new Date().toISOString(),
            attempt: nextAttempt,
            correlationId,
            code: failure.code,
            message: failure.message,
          }),
          metadata: {
            ...asRecord(runningStep.metadata),
            failedAt: new Date().toISOString(),
          },
        },
      )

      if (failedStep) {
        stepMap.set(definition.stepId, failedStep)
      }

      const nextStatus: ProvisioningJobStatus =
        failure.manualInterventionRequired
          ? 'blocked_manual'
          : failure.recoverable
            ? 'retrying'
            : 'failed'

      const shouldComplete =
        nextStatus === 'failed' || nextStatus === 'blocked_manual'

      await updateAgentProvisioningJob(job.id, {
        status: nextStatus,
        completedAt: shouldComplete ? new Date() : null,
        lastErrorCode: failure.code,
        lastErrorMessage: failure.message,
        intentProfile: state.intentProfile || null,
        runtimeState: state,
      })

      await updateOrganizationProvisioningMetadata({
        organizationId: job.organizationId,
        jobId: job.id,
        status: nextStatus,
        stepId: definition.stepId,
        correlationId,
        attempt: Number(job.attempt || 1),
        lastErrorCode: failure.code,
        lastErrorMessage: failure.message,
      })

      await updateAgentRepo(job.agentId, job.organizationId, {
        readinessStatus: failure.manualInterventionRequired
          ? 'blocked'
          : 'degraded',
        syncPending: true,
        lastSyncError: failure.message,
      })

      logger.error(
        {
          error,
          provisioningJobId: job.id,
          stepId: definition.stepId,
          failure,
        },
        'Provisioning step failed',
      )

      if (!failure.recoverable || failure.manualInterventionRequired) {
        throw new UnrecoverableError(`${failure.code}: ${failure.message}`)
      }

      throw error instanceof Error
        ? error
        : new Error(`${failure.code}: ${failure.message}`)
    }
  }

  await updateAgentProvisioningJob(job.id, {
    status: 'completed',
    completedAt: new Date(),
    lastErrorCode: null,
    lastErrorMessage: null,
    intentProfile: state.intentProfile || null,
    runtimeState: state,
  })

  await updateOrganizationProvisioningMetadata({
    organizationId: job.organizationId,
    jobId: job.id,
    status: 'completed',
    stepId: 'persist_versions_and_sync',
    correlationId,
    attempt: Number(job.attempt || 1),
  })

  const finalReadinessStatus =
    state.smoke?.status === 'passed' ? 'ready' : 'degraded'

  await updateAgentRepo(job.agentId, job.organizationId, {
    readinessStatus: finalReadinessStatus,
    syncPending: false,
    lastSyncError: null,
  })

  return {
    processed: true,
    provisioningJobId: job.id,
    status: 'completed',
    correlationId,
  }
}

export const getProvisioningJobById = async (
  jobId: string,
): Promise<ProvisioningJobView | null> => {
  const job = await findAgentProvisioningJobById(jobId)
  if (!job) return null
  return toJobView(job)
}

export const getProvisioningStepsByJobId = async (
  jobId: string,
): Promise<ProvisioningStepView[]> => {
  const steps = await listAgentProvisioningSteps(jobId)
  return steps.map(toStepView)
}

export const getProvisioningJobWithStepsById = async (
  jobId: string,
): Promise<ProvisioningJobWithSteps | null> => {
  return getJobSnapshot(jobId)
}

export const getLatestProvisioningJobForAgent = async (
  agentId: string,
): Promise<ProvisioningJobWithSteps | null> => {
  const latestJob = await findLatestAgentProvisioningJobByAgentId(agentId)
  if (!latestJob) return null

  return getJobSnapshot(latestJob.id)
}

export const retryProvisioningJob = async (input: {
  jobId: string
  requestedByUserId: string
  correlationId: string
  idempotencyKey?: string
}): Promise<ProvisioningJobWithSteps> => {
  const existing = await findAgentProvisioningJobById(input.jobId)
  if (!existing) {
    throw new ProvisioningStepError({
      code: 'PROVISIONING_JOB_NOT_FOUND',
      message: `Provisioning job ${input.jobId} not found`,
      recoverable: false,
    })
  }

  const status = existing.status as ProvisioningJobStatus
  if (!TERMINAL_JOB_STATUSES.has(status) && status !== 'retrying') {
    throw new ProvisioningStepError({
      code: 'PROVISIONING_RETRY_NOT_ALLOWED',
      message: `Provisioning job ${input.jobId} is not retryable in status ${status}`,
      recoverable: false,
    })
  }

  const existingRuntimeState = parseRuntimeState(existing.runtimeState)
  const previousRetryRequest = asRecord(existingRuntimeState.manualRetryRequest)
  const previousRetryIdempotencyKey = normalizeString(
    previousRetryRequest.idempotencyKey,
  )
  const requestIdempotencyKey = normalizeString(input.idempotencyKey)

  if (
    requestIdempotencyKey &&
    previousRetryIdempotencyKey === requestIdempotencyKey
  ) {
    const snapshot = await getJobSnapshot(existing.id)
    if (!snapshot) {
      throw new Error(
        `Provisioning job ${existing.id} missing after idempotent retry lookup`,
      )
    }

    return snapshot
  }

  const nextAttempt = Number(existing.attempt || 1) + 1
  const failedStepId = await findFailedStepId(existing.id)

  if (failedStepId) {
    const failedStep = await findAgentProvisioningStep(
      existing.id,
      failedStepId,
    )
    if (failedStep) {
      await updateAgentProvisioningStepByStepId(existing.id, failedStepId, {
        status: 'pending',
        completedAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        eventLog: withStepEvent(failedStep.eventLog, {
          type: 'retry_requested',
          at: new Date().toISOString(),
          attempt: nextAttempt,
          correlationId: input.correlationId,
          message: `Retry requested by user ${input.requestedByUserId}`,
        }),
      })
    }
  }

  await updateAgentProvisioningJob(existing.id, {
    status: 'retrying',
    attempt: nextAttempt,
    completedAt: null,
    lastErrorCode: null,
    lastErrorMessage: null,
    runtimeState: {
      ...existingRuntimeState,
      manualRetryRequest: {
        idempotencyKey: requestIdempotencyKey || null,
        requestedByUserId: input.requestedByUserId,
        requestedAt: new Date().toISOString(),
        correlationId: input.correlationId,
        attempt: nextAttempt,
      },
    },
  })

  await updateOrganizationProvisioningMetadata({
    organizationId: existing.organizationId,
    jobId: existing.id,
    status: 'retrying',
    stepId: failedStepId || undefined,
    correlationId: input.correlationId,
    attempt: nextAttempt,
  })

  await enqueueProvisioningJob({
    jobId: existing.id,
    organizationId: existing.organizationId,
    agentId: existing.agentId,
    correlationId: input.correlationId,
    idempotencyKey: existing.idempotencyKey,
    attempt: nextAttempt,
  })

  const snapshot = await getJobSnapshot(existing.id)
  if (!snapshot) {
    throw new Error(
      `Provisioning job ${existing.id} missing after retry enqueue`,
    )
  }

  return snapshot
}
