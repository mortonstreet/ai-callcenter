import { createHash, randomUUID } from 'crypto'
import { getElevenLabsClient } from '@/clients/elevenlabs.client'
import {
  createAgent as createAgentRepo,
  findById,
  updateAgent as updateAgentRepo,
  deleteAgent as deleteAgentRepo,
  getRecordingAggregates,
  getRecordingTimeSeries,
} from '@/repositories/agent.repository'
import {
  createAgentProvisioningJob,
  createAgentProvisioningSteps,
} from '@/repositories/provisioning.repository'
import { formatToSlug } from '@/utils'
import { AgentExternalType, AgentHealthResponse } from '@shared/types/src'
import logger from '@/lib/logger'
import { enqueueQueueJob } from '@/queues'
import { QUEUE_NAMES, QueueJobPayload } from '@/types/queues'
import {
  buildWizardIntentProfileV1,
  GreetingMode,
  getAgentProfileV1,
  WizardIntentProfileV1,
} from '@/services/agent-profile.service'
import { compileAgentProvisioning } from '@/services/prompt-compiler.service'
import {
  evaluateAgentHealth,
  getPrimaryBlockingFailureMessage,
  getPrimaryNonOkCheckMessage,
} from '@/services/agent-health.service'
import {
  CoreProvisioningStepId,
  CoreTabProvisioningEvidence,
  CoreTabProvisioningPlan,
  buildCoreTabProvisioningPlan,
  createCoreTabProvisioningEvidence,
  generateProvisioningSecret,
} from '@/services/agent-core-tab-autoprovisioning'
import { buildElevenLabsUpdatePayload as buildElevenLabsPayload } from '@/services/elevenlabs-update-payload'

// Voice cache
let voicesCache: { data: any; timestamp: number } | null = null
const VOICE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const CURATED_VOICE_LIMIT = 30
const CURATED_VOICE_CATEGORIES = new Set(['premade', 'professional'])
const CURATED_VOICE_ALLOWLIST = (
  process.env.ELEVEN_LABS_CURATED_VOICE_IDS || ''
)
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean)

export const AGENT_PROVISION_RETRY_JOB_NAME = 'agent-provision-retry'
export const AGENT_UPDATE_RETRY_JOB_NAME = 'agent-update-retry'

type VoiceCatalogEntry = {
  voice_id: string
  name: string
  category: string
  labels?: Record<string, string>
  preview_url?: string
}

type AgentRecord = Awaited<ReturnType<typeof findById>>

interface CreateAgentParams {
  organizationId: string
  companyName: string
  name: string
  industry?: string
  useCase?: string
  website?: string
  knowledgeSources?: string[]
  transferNumber?: string
  businessTimezone?: string
  languages?: string[]
  mainGoal?: string
  voiceId?: string
  greetingMode?: GreetingMode
  customGreeting?: string
  firstMessage?: string
  services?: string[]
  discoveryQuestions?: string[]
  serviceQuestions?: string[]
  providerCorrelationKey?: string
}

export interface UpdateElevenLabsAgentParams {
  name?: string
  firstMessage?: string
  systemPrompt?: string
  voiceId?: string
  language?: string
  llmModel?: string
  temperature?: number
  maxTokens?: number
  stability?: number
  similarityBoost?: number
  speed?: number
  dataCollection?: Record<string, any>
  evaluationCriteria?: any[]
  tools?: any[]
  toolIds?: string[]
  builtInTools?: string[]
  knowledgeBase?: any
  workflow?: Record<string, any>
  status?: 'draft' | 'active' | 'paused' | 'archived' | 'error'
  security?: {
    authTokenEnabled?: boolean
    allowedOrigins?: string[]
  }
  callLimits?: {
    maxConcurrent?: number
    dailyCap?: number
  }
  privacy?: {
    recordingRetention?: string
  }
  webhooks?: {
    postCallUrl?: string
    events?: string[]
  }
  conversation?: {
    maxDurationSeconds?: number
    textOnlyMode?: boolean
    silenceEndCallTimeout?: number
    turnTimeout?: number
  }
  advanced?: {
    maxConcurrentCalls?: number
    maxCallDuration?: number
    silenceEndCallTimeout?: number
    turnTimeout?: number
    postCallWebhookUrl?: string
  }
}

export interface AgentProvisionRetryPayload extends QueueJobPayload {
  agentId: string
  organizationId: string
  companyName: string
  name: string
  industry?: string
  useCase?: string
  website?: string
  knowledgeSources?: string[]
  transferNumber?: string
  businessTimezone?: string
  languages?: string[]
  mainGoal?: string
  voiceId?: string
  greetingMode?: GreetingMode
  customGreeting?: string
  firstMessage?: string
  services?: string[]
  discoveryQuestions?: string[]
  serviceQuestions?: string[]
  wizardIntentProfile?: WizardIntentProfileV1
  promptProfileVersion?: string
  configProfileVersion?: string
  profileHash?: string
  providerCorrelationKey: string
}

export interface AgentUpdateRetryPayload extends QueueJobPayload {
  agentId: string
  organizationId: string
  updates: UpdateElevenLabsAgentParams
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  return 'Unknown provider sync error'
}

const getUpdateIdempotencyKey = (
  agentId: string,
  updates: UpdateElevenLabsAgentParams,
): string => {
  const digest = createHash('sha1')
    .update(JSON.stringify(updates))
    .digest('hex')
  return `agent-update:${agentId}:${digest.slice(0, 16)}`
}

const curateWorkspaceVoices = (rawVoices: unknown): VoiceCatalogEntry[] => {
  const voices = Array.isArray(rawVoices) ? rawVoices : []
  const validVoices: VoiceCatalogEntry[] = []

  for (const voice of voices) {
    if (!voice || typeof voice !== 'object') {
      continue
    }

    const record = voice as Record<string, unknown>
    const voiceId = typeof record.voice_id === 'string' ? record.voice_id : null
    const name = typeof record.name === 'string' ? record.name : null
    const categoryRaw =
      typeof record.category === 'string' ? record.category : 'unknown'

    if (!voiceId || !name) {
      continue
    }

    validVoices.push({
      voice_id: voiceId,
      name,
      category: categoryRaw.toLowerCase(),
      labels:
        record.labels && typeof record.labels === 'object'
          ? (record.labels as Record<string, string>)
          : undefined,
      preview_url:
        typeof record.preview_url === 'string' ? record.preview_url : undefined,
    })
  }

  const deduped = Array.from(
    new Map(validVoices.map((voice) => [voice.voice_id, voice])).values(),
  )

  const allowlisted =
    CURATED_VOICE_ALLOWLIST.length > 0
      ? deduped.filter((voice) =>
          CURATED_VOICE_ALLOWLIST.includes(voice.voice_id),
        )
      : deduped

  const categoryCurated = allowlisted.filter((voice) =>
    CURATED_VOICE_CATEGORIES.has(voice.category),
  )

  const source = categoryCurated.length > 0 ? categoryCurated : allowlisted

  return source
    .sort((left, right) => {
      const leftHasPreview = left.preview_url ? 1 : 0
      const rightHasPreview = right.preview_url ? 1 : 0
      if (leftHasPreview !== rightHasPreview) {
        return rightHasPreview - leftHasPreview
      }
      return left.name.localeCompare(right.name)
    })
    .slice(0, CURATED_VOICE_LIMIT)
}

const toGreetingMode = (
  greetingMode?: GreetingMode,
  customGreeting?: string,
): GreetingMode => {
  if (greetingMode === 'custom' && customGreeting?.trim()) {
    return 'custom'
  }
  return 'generated'
}

const buildIntentProfileFromCreateParams = (
  params: Omit<CreateAgentParams, 'organizationId' | 'providerCorrelationKey'>,
) => {
  const discoveryQuestions =
    params.discoveryQuestions && params.discoveryQuestions.length > 0
      ? params.discoveryQuestions
      : params.serviceQuestions

  const customGreeting = params.customGreeting || params.firstMessage
  const greetingMode = toGreetingMode(params.greetingMode, customGreeting)

  return buildWizardIntentProfileV1({
    companyName: params.companyName,
    agentName: params.name,
    industry: params.industry,
    useCase: params.useCase,
    website: params.website,
    mainObjective: params.mainGoal,
    services: params.services,
    discoveryQuestions,
    knowledgeSources: params.knowledgeSources,
    voiceId: params.voiceId,
    greetingMode,
    customGreeting,
    transferNumber: params.transferNumber,
    businessTimezone: params.businessTimezone,
    languages: params.languages,
  })
}

const compileProvisioningFromIntent = (
  intentProfile: WizardIntentProfileV1,
) => {
  const profile = getAgentProfileV1()
  const compiled = compileAgentProvisioning({
    intentProfile,
    profile,
  })

  return {
    profile,
    compiled,
  }
}

export const buildElevenLabsUpdatePayload = (
  updates: UpdateElevenLabsAgentParams,
) => buildElevenLabsPayload(updates)

interface CoreTabProvisioningRunInput {
  client: ReturnType<typeof getElevenLabsClient>
  externalAgentId: string
  website?: string
  knowledgeSources?: string[]
  transferNumber?: string
}

interface CoreTabProvisioningRunResult {
  plan: CoreTabProvisioningPlan
  evidence: CoreTabProvisioningEvidence
  errorMessage: string | null
}

const appendProvisioningStep = (
  evidence: CoreTabProvisioningEvidence,
  stepId: CoreProvisioningStepId,
  status: 'completed' | 'failed' | 'skipped',
  details: Record<string, unknown>,
  startedAt: Date,
  completedAt: Date = new Date(),
) => {
  evidence.steps.push({
    stepId,
    status,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    details,
  })
}

const runCoreTabProvisioning = async (
  input: CoreTabProvisioningRunInput,
): Promise<CoreTabProvisioningRunResult> => {
  const plan = buildCoreTabProvisioningPlan({
    website: input.website,
    knowledgeSources: input.knowledgeSources,
    transferNumber: input.transferNumber,
  })
  const evidence = createCoreTabProvisioningEvidence(plan)

  if (!plan.workflowValidation.requiredRoutesPresent) {
    const message = `Missing required workflow routes: ${plan.workflowValidation.missingIntentRoutes.join(', ')}`
    const startedAt = new Date()
    appendProvisioningStep(
      evidence,
      'apply_core_tabs_profile',
      'failed',
      {
        reason: 'workflow_validation_failed',
        missingRoutes: plan.workflowValidation.missingIntentRoutes,
      },
      startedAt,
    )
    evidence.errors.push({
      stepId: 'apply_core_tabs_profile',
      message,
      at: new Date().toISOString(),
    })
    return {
      plan,
      evidence,
      errorMessage: message,
    }
  }

  const applyCoreTabsStartedAt = new Date()
  try {
    const providerPayload = buildElevenLabsUpdatePayload(plan.updateParams)
    await input.client.updateAgent(input.externalAgentId, providerPayload)
    appendProvisioningStep(
      evidence,
      'apply_core_tabs_profile',
      'completed',
      {
        tabDomains: [
          'agent',
          'llm',
          'voice',
          'workflow',
          'branches',
          'analysis',
          'tools',
          'security',
          'advanced',
        ],
        toolIds: plan.updateParams.toolIds,
        builtInTools: plan.updateParams.builtInTools,
      },
      applyCoreTabsStartedAt,
    )
  } catch (error) {
    const errorMessage = getErrorMessage(error)
    appendProvisioningStep(
      evidence,
      'apply_core_tabs_profile',
      'failed',
      {
        reason: 'provider_update_failed',
        error: errorMessage,
      },
      applyCoreTabsStartedAt,
    )
    evidence.errors.push({
      stepId: 'apply_core_tabs_profile',
      message: errorMessage,
      at: new Date().toISOString(),
    })
    return {
      plan,
      evidence,
      errorMessage,
    }
  }

  const knowledgeIngestStartedAt = new Date()
  if (plan.knowledgeManifest.ingestibleSources.length === 0) {
    appendProvisioningStep(
      evidence,
      'ingest_knowledge_sources',
      'skipped',
      {
        reason: 'no_ingestible_sources',
        manifestEntries: plan.knowledgeManifest.entries,
      },
      knowledgeIngestStartedAt,
    )
  } else {
    const sourceOutcomes: Array<Record<string, unknown>> = []
    let ingestFailed = false

    for (const sourceUrl of plan.knowledgeManifest.ingestibleSources) {
      try {
        await input.client.addKnowledgeBaseUrl(input.externalAgentId, sourceUrl)
        sourceOutcomes.push({
          sourceUrl,
          status: 'completed',
        })
      } catch (error) {
        ingestFailed = true
        sourceOutcomes.push({
          sourceUrl,
          status: 'failed',
          error: getErrorMessage(error),
        })
      }
    }

    appendProvisioningStep(
      evidence,
      'ingest_knowledge_sources',
      ingestFailed ? 'failed' : 'completed',
      {
        sourceOutcomes,
        skippedEntries: plan.knowledgeManifest.entries.filter(
          (entry) => entry.status === 'skipped',
        ),
      },
      knowledgeIngestStartedAt,
    )

    if (ingestFailed) {
      const errorMessage = 'One or more knowledge sources failed to ingest.'
      evidence.errors.push({
        stepId: 'ingest_knowledge_sources',
        message: errorMessage,
        at: new Date().toISOString(),
      })
      return {
        plan,
        evidence,
        errorMessage,
      }
    }
  }

  const attachStartedAt = new Date()
  appendProvisioningStep(
    evidence,
    'attach_webhooks_and_mcp',
    'completed',
    {
      mcp: {
        enabled: plan.mcpDefaults.enabled,
        endpoint: plan.mcpDefaults.endpoint,
        approvalPolicy: plan.mcpDefaults.approvalPolicy,
      },
      webhooks: {
        postCallUrl: plan.updateParams.webhooks.postCallUrl,
        events: plan.updateParams.webhooks.events,
        signingRequired: plan.webhookSigningRequired,
      },
    },
    attachStartedAt,
  )

  const registerTestsStartedAt = new Date()
  appendProvisioningStep(
    evidence,
    'register_baseline_tests',
    'completed',
    {
      baselineSuite: plan.tests.baselineSuite,
      blockActivationOnFailures: plan.tests.blockActivationOnFailures,
      runSchedule: plan.tests.runSchedule,
    },
    registerTestsStartedAt,
  )

  return {
    plan,
    evidence,
    errorMessage: null,
  }
}

const CORE_TAB_STEP_ORDER: Record<CoreProvisioningStepId, number> = {
  apply_core_tabs_profile: 1,
  ingest_knowledge_sources: 2,
  attach_webhooks_and_mcp: 3,
  register_baseline_tests: 4,
}

const persistCoreTabProvisioningEvidence = async (input: {
  organizationId: string
  agentId: string
  providerCorrelationKey: string
  intentProfile: WizardIntentProfileV1
  evidence: CoreTabProvisioningEvidence
  errorMessage: string | null
}) => {
  try {
    const generatedAt = new Date(input.evidence.generatedAt)
    const startedAt =
      input.evidence.steps.length > 0
        ? new Date(input.evidence.steps[0].startedAt)
        : generatedAt

    const job = await createAgentProvisioningJob({
      organizationId: input.organizationId,
      agentId: input.agentId,
      requestedByUserId: null,
      correlationId: input.providerCorrelationKey,
      idempotencyKey: `${input.providerCorrelationKey}:core-tabs:${randomUUID()}`,
      status: input.errorMessage ? 'failed' : 'completed',
      attempt: 1,
      lastErrorCode: null,
      lastErrorMessage: input.errorMessage,
      wizardInput: input.intentProfile as any,
      intentProfile: input.intentProfile as any,
      runtimeState: input.evidence as any,
      startedAt,
      completedAt: new Date(),
      updatedAt: new Date(),
    })

    await createAgentProvisioningSteps(
      input.evidence.steps.map((step) => {
        const metadata = step.details as Record<string, unknown>
        const error =
          step.status === 'failed'
            ? typeof metadata.error === 'string'
              ? metadata.error
              : input.errorMessage
            : null

        return {
          jobId: job.id,
          organizationId: input.organizationId,
          agentId: input.agentId,
          stepId: step.stepId,
          stepOrder: CORE_TAB_STEP_ORDER[step.stepId],
          status: step.status,
          attempt: 1,
          correlationId: input.providerCorrelationKey,
          lastErrorCode: null,
          lastErrorMessage: error,
          eventLog: step.details as any,
          metadata: step.details as any,
          startedAt: new Date(step.startedAt),
          completedAt: new Date(step.completedAt),
          updatedAt: new Date(),
        }
      }),
    )
  } catch (error) {
    logger.warn(
      {
        error,
        organizationId: input.organizationId,
        agentId: input.agentId,
      },
      'Failed to persist core-tab provisioning evidence',
    )
  }
}

export async function enqueueAgentProvisionRetry(
  payload: AgentProvisionRetryPayload,
) {
  return enqueueQueueJob(
    QUEUE_NAMES.INTEGRATION_SYNC,
    AGENT_PROVISION_RETRY_JOB_NAME,
    {
      ...payload,
      idempotencyKey:
        payload.idempotencyKey ||
        `agent-provision:${payload.providerCorrelationKey}`,
    },
  )
}

export async function enqueueAgentUpdateRetry(
  payload: AgentUpdateRetryPayload,
) {
  return enqueueQueueJob(
    QUEUE_NAMES.INTEGRATION_SYNC,
    AGENT_UPDATE_RETRY_JOB_NAME,
    {
      ...payload,
      idempotencyKey:
        payload.idempotencyKey ||
        getUpdateIdempotencyKey(payload.agentId, payload.updates),
    },
  )
}

export class AgentActivationBlockedError extends Error {
  readonly health: AgentHealthResponse

  constructor(message: string, health: AgentHealthResponse) {
    super(message)
    this.name = 'AgentActivationBlockedError'
    this.health = health
  }
}

const applyReadinessOutcome = async (input: {
  agent: AgentRecord
  promptOverride?: string
  greetingOverride?: string
  activationRequested?: boolean
  scheduleDegradedRetry?: boolean
}): Promise<AgentRecord> => {
  const {
    agent,
    promptOverride,
    greetingOverride,
    activationRequested = false,
    scheduleDegradedRetry = true,
  } = input

  try {
    const health = await evaluateAgentHealth(agent.id, agent.organizationId, {
      mode: 'provisioning',
      promptOverride,
      greetingOverride,
    })

    if (health.status === 'blocked') {
      const blockedMessage = getPrimaryBlockingFailureMessage(health)
      const blockedAgent = await updateAgentRepo(
        agent.id,
        agent.organizationId,
        {
          status: 'error',
          syncPending:
            health.checks.provider.status !== 'ok' || agent.syncPending,
          lastSyncError: blockedMessage,
          readinessStatus: 'blocked',
        },
      )

      if (activationRequested) {
        throw new AgentActivationBlockedError(blockedMessage, health)
      }

      return blockedAgent
    }

    if (health.status === 'degraded') {
      const degradedMessage = getPrimaryNonOkCheckMessage(health)
      const needsReadinessUpdate = agent.readinessStatus !== 'degraded'

      if (scheduleDegradedRetry) {
        try {
          await enqueueAgentUpdateRetry({
            agentId: agent.id,
            organizationId: agent.organizationId,
            updates: {},
          })
        } catch (queueError) {
          logger.warn(
            {
              queueError,
              agentId: agent.id,
              organizationId: agent.organizationId,
            },
            'Failed to enqueue degraded readiness retry',
          )
        }
      }

      if (degradedMessage && degradedMessage !== agent.lastSyncError) {
        return updateAgentRepo(agent.id, agent.organizationId, {
          lastSyncError: degradedMessage,
          readinessStatus: 'degraded',
        })
      }

      if (needsReadinessUpdate) {
        return updateAgentRepo(agent.id, agent.organizationId, {
          readinessStatus: 'degraded',
        })
      }

      return agent
    }

    if (agent.lastSyncError || agent.readinessStatus !== 'ready') {
      return updateAgentRepo(agent.id, agent.organizationId, {
        lastSyncError: null,
        readinessStatus: 'ready',
      })
    }
  } catch (error) {
    if (error instanceof AgentActivationBlockedError) {
      throw error
    }

    logger.warn(
      { error, agentId: agent.id, organizationId: agent.organizationId },
      'Failed readiness evaluation after provisioning change',
    )
  }

  return agent
}

export async function createElevenLabsAgent(params: CreateAgentParams) {
  const {
    organizationId,
    companyName,
    name,
    industry,
    useCase,
    website,
    knowledgeSources = [],
    transferNumber,
    businessTimezone,
    languages = [],
    mainGoal,
    voiceId,
    greetingMode,
    customGreeting,
    firstMessage,
    services = [],
    discoveryQuestions = [],
    serviceQuestions = [],
  } = params

  const providerCorrelationKey =
    params.providerCorrelationKey ||
    `${organizationId}:${formatToSlug(name)}:${randomUUID()}`

  const intentProfile = buildIntentProfileFromCreateParams({
    companyName,
    name,
    industry,
    useCase,
    website,
    knowledgeSources,
    transferNumber,
    businessTimezone,
    languages,
    mainGoal,
    voiceId,
    greetingMode,
    customGreeting,
    firstMessage,
    services,
    discoveryQuestions,
    serviceQuestions,
  })
  const { profile, compiled } = compileProvisioningFromIntent(intentProfile)
  const prompt = compiled.systemPrompt
  const greeting = compiled.firstMessage
  const suggestedVoice = compiled.voice.voiceId
  let createdExternalId: string | null = null

  try {
    const client = getElevenLabsClient()
    const elevenLabsAgent = await client.createAgent({
      name,
      conversation_config: {
        agent: {
          prompt: {
            prompt,
            llm: profile.llm.model,
            temperature: profile.llm.temperature,
            max_tokens: profile.llm.maxTokens,
          },
          first_message: greeting,
          language: profile.language,
        },
        tts: {
          voice_id: suggestedVoice,
          stability: compiled.voice.stability,
          similarity_boost: compiled.voice.similarityBoost,
          speed: compiled.voice.speed,
        },
      },
    })
    createdExternalId = elevenLabsAgent.agent_id

    logger.info(
      `Created ElevenLabs agent: ${elevenLabsAgent.agent_id} for org ${organizationId}`,
    )

    const provisioningResult = await runCoreTabProvisioning({
      client,
      externalAgentId: elevenLabsAgent.agent_id,
      website,
      knowledgeSources,
      transferNumber,
    })
    const provisioningFailed = Boolean(provisioningResult.errorMessage)

    const createdAgent = await createAgentRepo({
      name,
      slug: formatToSlug(name),
      organizationId,
      phoneNumber: '+15555550123',
      redirectNumber: '+15555550123',
      externalId: elevenLabsAgent.agent_id,
      externalType: AgentExternalType.ELEVEN_LABS,
      industry: industry || null,
      useCase: useCase || null,
      website: website || null,
      mainGoal: mainGoal || null,
      voiceId: suggestedVoice || null,
      promptProfileVersion: compiled.promptProfileVersion,
      configProfileVersion: compiled.configProfileVersion,
      profileHash: compiled.profileHash,
      wizardIntentProfile: JSON.stringify(intentProfile),
      status: provisioningFailed ? 'error' : 'active',
      syncPending: provisioningFailed,
      lastSyncAt: provisioningFailed ? null : new Date(),
      lastSyncError: provisioningResult.errorMessage,
      providerCorrelationKey,
      mcpApiKey: generateProvisioningSecret('mcp_'),
      webhookSecret: generateProvisioningSecret('wsec_'),
      mcpEndpointUrl: provisioningResult.plan.mcpDefaults.endpoint,
    })

    await persistCoreTabProvisioningEvidence({
      organizationId,
      agentId: createdAgent.id,
      providerCorrelationKey,
      intentProfile,
      evidence: provisioningResult.evidence,
      errorMessage: provisioningResult.errorMessage,
    })

    if (provisioningResult.errorMessage) {
      logger.warn(
        {
          organizationId,
          agentId: createdAgent.id,
          externalId: createdAgent.externalId,
          error: provisioningResult.errorMessage,
        },
        'Core-tab auto-provisioning failed during create; scheduling full provision retry',
      )

      try {
        await enqueueAgentProvisionRetry({
          agentId: createdAgent.id,
          organizationId,
          companyName,
          name,
          industry,
          useCase,
          website,
          knowledgeSources,
          transferNumber,
          businessTimezone,
          languages,
          mainGoal,
          voiceId: voiceId || undefined,
          greetingMode,
          customGreeting,
          firstMessage: greeting,
          services,
          discoveryQuestions,
          serviceQuestions,
          wizardIntentProfile: intentProfile,
          promptProfileVersion: compiled.promptProfileVersion,
          configProfileVersion: compiled.configProfileVersion,
          profileHash: compiled.profileHash,
          providerCorrelationKey,
        })
      } catch (queueError) {
        logger.error(
          { queueError, organizationId, agentId: createdAgent.id },
          'Failed to enqueue core-tab provisioning retry',
        )
      }
    }

    return applyReadinessOutcome({
      agent: createdAgent,
      promptOverride: prompt,
      greetingOverride: greeting,
    })
  } catch (error) {
    const errorMessage = getErrorMessage(error)

    if (createdExternalId) {
      logger.error(
        {
          error,
          organizationId,
          providerCorrelationKey,
          externalId: createdExternalId,
        },
        'Post-create provisioning failed after provider agent was created',
      )
      throw error instanceof Error ? error : new Error(errorMessage)
    }

    logger.warn(
      {
        error,
        organizationId,
        providerCorrelationKey,
      },
      'Failed to create ElevenLabs agent, creating local fallback',
    )

    const fallbackAgent = await createAgentRepo({
      name,
      slug: formatToSlug(name),
      organizationId,
      phoneNumber: '+15555550123',
      redirectNumber: '+15555550123',
      externalId: `fallback:${providerCorrelationKey}`,
      externalType: AgentExternalType.LOCAL_FALLBACK,
      industry: industry || null,
      useCase: useCase || null,
      website: website || null,
      mainGoal: mainGoal || null,
      voiceId: suggestedVoice || null,
      promptProfileVersion: compiled.promptProfileVersion,
      configProfileVersion: compiled.configProfileVersion,
      profileHash: compiled.profileHash,
      wizardIntentProfile: JSON.stringify(intentProfile),
      status: 'error',
      syncPending: true,
      lastSyncAt: null,
      lastSyncError: errorMessage,
      providerCorrelationKey,
    })

    try {
      await enqueueAgentProvisionRetry({
        agentId: fallbackAgent.id,
        organizationId,
        companyName,
        name,
        industry,
        useCase,
        website,
        knowledgeSources,
        transferNumber,
        businessTimezone,
        languages,
        mainGoal,
        voiceId: voiceId || undefined,
        greetingMode,
        customGreeting,
        firstMessage: greeting,
        services,
        discoveryQuestions,
        serviceQuestions,
        wizardIntentProfile: intentProfile,
        promptProfileVersion: compiled.promptProfileVersion,
        configProfileVersion: compiled.configProfileVersion,
        profileHash: compiled.profileHash,
        providerCorrelationKey,
      })
    } catch (queueError) {
      logger.error(
        { queueError, agentId: fallbackAgent.id, organizationId },
        'Failed to enqueue fallback agent provision retry',
      )
    }

    return fallbackAgent
  }
}

export async function retryAgentProvision(payload: AgentProvisionRetryPayload) {
  const existingAgent = await findById(payload.agentId, payload.organizationId)

  const intentProfile =
    payload.wizardIntentProfile ||
    buildIntentProfileFromCreateParams({
      companyName: payload.companyName,
      name: payload.name,
      industry: payload.industry,
      useCase: payload.useCase,
      website: payload.website,
      knowledgeSources: payload.knowledgeSources,
      transferNumber: payload.transferNumber,
      businessTimezone: payload.businessTimezone,
      languages: payload.languages,
      mainGoal: payload.mainGoal,
      voiceId: payload.voiceId,
      greetingMode: payload.greetingMode,
      customGreeting: payload.customGreeting,
      firstMessage: payload.firstMessage,
      services: payload.services,
      discoveryQuestions: payload.discoveryQuestions,
      serviceQuestions: payload.serviceQuestions,
    })

  const { profile, compiled } = compileProvisioningFromIntent(intentProfile)
  const prompt = compiled.systemPrompt
  const greeting = compiled.firstMessage
  const suggestedVoice = compiled.voice.voiceId

  const client = getElevenLabsClient()

  if (
    existingAgent.externalType === AgentExternalType.ELEVEN_LABS &&
    !existingAgent.syncPending
  ) {
    return existingAgent
  }

  const runRecovery = async (externalId: string) => {
    const provisioningResult = await runCoreTabProvisioning({
      client,
      externalAgentId: externalId,
      website: payload.website,
      knowledgeSources: payload.knowledgeSources,
      transferNumber: payload.transferNumber,
    })
    const provisioningFailed = Boolean(provisioningResult.errorMessage)

    const recoveredAgent = await updateAgentRepo(
      payload.agentId,
      payload.organizationId,
      {
        externalId,
        externalType: AgentExternalType.ELEVEN_LABS,
        voiceId: suggestedVoice || null,
        promptProfileVersion: compiled.promptProfileVersion,
        configProfileVersion: compiled.configProfileVersion,
        profileHash: compiled.profileHash,
        wizardIntentProfile: JSON.stringify(intentProfile),
        status: provisioningFailed ? 'error' : 'active',
        syncPending: provisioningFailed,
        lastSyncAt: provisioningFailed ? null : new Date(),
        lastSyncError: provisioningResult.errorMessage,
        providerCorrelationKey: payload.providerCorrelationKey,
        mcpApiKey:
          existingAgent.mcpApiKey || generateProvisioningSecret('mcp_'),
        webhookSecret:
          existingAgent.webhookSecret || generateProvisioningSecret('wsec_'),
        mcpEndpointUrl: provisioningResult.plan.mcpDefaults.endpoint,
      },
    )

    await persistCoreTabProvisioningEvidence({
      organizationId: payload.organizationId,
      agentId: recoveredAgent.id,
      providerCorrelationKey: payload.providerCorrelationKey,
      intentProfile,
      evidence: provisioningResult.evidence,
      errorMessage: provisioningResult.errorMessage,
    })

    if (provisioningResult.errorMessage) {
      throw new Error(provisioningResult.errorMessage)
    }

    return applyReadinessOutcome({
      agent: recoveredAgent,
      promptOverride: prompt,
      greetingOverride: greeting,
      scheduleDegradedRetry: false,
    })
  }

  if (existingAgent.externalType === AgentExternalType.ELEVEN_LABS) {
    logger.info(
      {
        agentId: payload.agentId,
        organizationId: payload.organizationId,
        providerCorrelationKey: payload.providerCorrelationKey,
        externalId: existingAgent.externalId,
      },
      'Retrying core-tab provisioning on existing ElevenLabs agent',
    )
    return runRecovery(existingAgent.externalId)
  }

  const elevenLabsAgent = await client.createAgent({
    name: payload.name,
    conversation_config: {
      agent: {
        prompt: {
          prompt,
          llm: profile.llm.model,
          temperature: profile.llm.temperature,
          max_tokens: profile.llm.maxTokens,
        },
        first_message: greeting,
        language: profile.language,
      },
      tts: {
        voice_id: suggestedVoice,
        stability: compiled.voice.stability,
        similarity_boost: compiled.voice.similarityBoost,
        speed: compiled.voice.speed,
      },
    },
  })

  logger.info(
    {
      agentId: payload.agentId,
      organizationId: payload.organizationId,
      providerCorrelationKey: payload.providerCorrelationKey,
      externalId: elevenLabsAgent.agent_id,
    },
    'Recovered fallback agent with ElevenLabs provider',
  )

  return runRecovery(elevenLabsAgent.agent_id)
}

export async function updateElevenLabsAgent(
  agentId: string,
  organizationId: string,
  updates: UpdateElevenLabsAgentParams,
  options: { fromRetryJob?: boolean } = {},
) {
  const agent = await findById(agentId, organizationId)

  const localUpdates: Record<string, any> = {}
  if (updates.name) {
    localUpdates.name = updates.name
    localUpdates.slug = formatToSlug(updates.name)
  }
  if (updates.voiceId !== undefined) {
    localUpdates.voiceId = updates.voiceId
  }
  if (updates.status !== undefined) {
    localUpdates.status = updates.status
  }

  if (agent.externalType === AgentExternalType.LOCAL_FALLBACK) {
    localUpdates.syncPending = true
    localUpdates.status = 'error'
    localUpdates.lastSyncError =
      localUpdates.lastSyncError ||
      agent.lastSyncError ||
      'Agent is in local fallback mode and awaiting provider provisioning.'

    const updatedFallbackAgent = await updateAgentRepo(
      agentId,
      organizationId,
      localUpdates,
    )

    try {
      await enqueueAgentProvisionRetry({
        agentId,
        organizationId,
        companyName: updates.name || agent.name,
        name: updates.name || agent.name,
        industry: agent.industry || undefined,
        useCase: agent.useCase || undefined,
        website: agent.website || undefined,
        mainGoal: agent.mainGoal || undefined,
        voiceId: updates.voiceId || agent.voiceId || undefined,
        greetingMode: updates.firstMessage ? 'custom' : 'generated',
        customGreeting: updates.firstMessage,
        firstMessage: updates.firstMessage,
        services: [],
        discoveryQuestions: [],
        serviceQuestions: [],
        providerCorrelationKey:
          agent.providerCorrelationKey || `${organizationId}:${agentId}`,
      })
    } catch (queueError) {
      logger.error(
        { queueError, agentId, organizationId },
        'Failed to enqueue fallback provisioning retry for update',
      )
    }

    return updatedFallbackAgent
  }

  const elevenLabsUpdate = buildElevenLabsUpdatePayload(updates)

  try {
    if (Object.keys(elevenLabsUpdate).length > 0) {
      const client = getElevenLabsClient()
      await client.updateAgent(agent.externalId, elevenLabsUpdate)
      logger.info(`Updated ElevenLabs agent: ${agent.externalId}`)
    }

    localUpdates.syncPending = false
    localUpdates.lastSyncError = null
    localUpdates.lastSyncAt = new Date()

    const updatedAgent =
      Object.keys(localUpdates).length > 0
        ? await updateAgentRepo(agentId, organizationId, localUpdates)
        : agent

    return applyReadinessOutcome({
      agent: updatedAgent,
      promptOverride: updates.systemPrompt,
      greetingOverride: updates.firstMessage,
      activationRequested: updates.status === 'active',
      scheduleDegradedRetry: !options.fromRetryJob,
    })
  } catch (error) {
    if (error instanceof AgentActivationBlockedError) {
      throw error
    }

    const errorMessage = getErrorMessage(error)

    logger.warn(
      {
        error,
        agentId,
        organizationId,
      },
      'ElevenLabs update failed, marking agent sync pending',
    )

    localUpdates.syncPending = true
    localUpdates.status = 'error'
    localUpdates.lastSyncError = errorMessage

    const updatedAgent = await updateAgentRepo(
      agentId,
      organizationId,
      localUpdates,
    )

    if (options.fromRetryJob) {
      throw error instanceof Error ? error : new Error(errorMessage)
    }

    try {
      await enqueueAgentUpdateRetry({
        agentId,
        organizationId,
        updates,
      })
    } catch (queueError) {
      logger.error(
        { queueError, agentId, organizationId },
        'Failed to enqueue agent update retry',
      )
    }

    return updatedAgent
  }
}

export async function retryAgentUpdateSync(payload: AgentUpdateRetryPayload) {
  return updateElevenLabsAgent(
    payload.agentId,
    payload.organizationId,
    payload.updates,
    { fromRetryJob: true },
  )
}

export async function deleteElevenLabsAgent(
  agentId: string,
  organizationId: string,
) {
  const agent = await findById(agentId, organizationId)

  if (agent.externalType === AgentExternalType.ELEVEN_LABS) {
    const client = getElevenLabsClient()

    try {
      await client.deleteAgent(agent.externalId)
      logger.info(`Deleted ElevenLabs agent: ${agent.externalId}`)
    } catch (error) {
      logger.error(
        `Failed to delete ElevenLabs agent: ${agent.externalId}`,
        error,
      )
      // Continue to delete local record even if ElevenLabs delete fails
    }
  }

  return await deleteAgentRepo(agentId, organizationId)
}

export async function getElevenLabsAgentConfig(externalId: string) {
  const client = getElevenLabsClient()
  return await client.getAgent(externalId)
}

export async function getVoices() {
  if (voicesCache && Date.now() - voicesCache.timestamp < VOICE_CACHE_TTL) {
    return voicesCache.data
  }

  let voices: { voices: VoiceCatalogEntry[] }
  try {
    const client = getElevenLabsClient()
    const providerVoices = await client.listVoices()
    voices = {
      voices: curateWorkspaceVoices(providerVoices?.voices),
    }
  } catch (error) {
    logger.warn(
      { error },
      'ElevenLabs voices unavailable; returning empty curated voice list',
    )
    voices = { voices: [] }
  }

  voicesCache = {
    data: voices,
    timestamp: Date.now(),
  }

  return voices
}

export async function getAgentAnalytics(
  agentId: string,
  organizationId: string,
  startDate?: string,
  endDate?: string,
  granularity?: 'hour' | 'day' | 'week' | 'month',
) {
  const agent = await findById(agentId, organizationId)

  const [aggregates, timeSeries] = await Promise.all([
    getRecordingAggregates(
      organizationId,
      agent.externalId,
      startDate,
      endDate,
    ),
    getRecordingTimeSeries(organizationId, startDate, endDate, granularity),
  ])

  const normalizedTimeSeries = (timeSeries || []).map((bucket: any) => ({
    date:
      typeof bucket.period === 'string'
        ? bucket.period
        : new Date(bucket.period).toISOString().split('T')[0],
    calls: Number(bucket.calls || 0),
    avgDuration: Number(bucket.avgDuration || 0),
    totalCost: Number(bucket.totalCost || 0),
  }))

  return {
    totalCalls: Number(aggregates?.totalCalls || 0),
    avgDuration: Number(aggregates?.avgDuration || 0),
    totalCost: Number(aggregates?.totalCost || 0),
    avgCost: Number(aggregates?.avgCost || 0),
    productiveCalls: Number(aggregates?.productiveCalls || 0),
    timeSeries: normalizedTimeSeries,
  }
}

export async function getAgentConversations(
  agentId: string,
  organizationId: string,
  pageSize: number = 50,
) {
  const agent = await findById(agentId, organizationId)

  if (agent.externalType === AgentExternalType.LOCAL_FALLBACK) {
    return {
      conversations: [],
      has_more: false,
    }
  }

  const client = getElevenLabsClient()
  return client.listConversations(agent.externalId, pageSize)
}

export async function getAgentHealth(
  agentId: string,
  organizationId: string,
): Promise<AgentHealthResponse> {
  return evaluateAgentHealth(agentId, organizationId, {
    mode: 'runtime',
  })
}
