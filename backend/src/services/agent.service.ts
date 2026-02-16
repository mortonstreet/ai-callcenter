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
import { getAgentTemplate } from '@/utils/agent-templates'
import { formatToSlug } from '@/utils'
import { AgentExternalType, AgentHealthResponse } from '@shared/types/src'
import logger from '@/lib/logger'
import { enqueueQueueJob } from '@/queues'
import { QUEUE_NAMES, QueueJobPayload } from '@/types/queues'
import { getRequestContext } from '@/lib/context'
import { emitTransitionAuditEvent } from '@/services/lifecycle-transition-audit.service'

// Voice cache
let voicesCache: { data: any; timestamp: number } | null = null
const VOICE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export const AGENT_PROVISION_RETRY_JOB_NAME = 'agent-provision-retry'
export const AGENT_UPDATE_RETRY_JOB_NAME = 'agent-update-retry'

interface CreateAgentParams {
  organizationId: string
  companyName: string
  name: string
  industry?: string
  useCase?: string
  website?: string
  mainGoal?: string
  voiceId?: string
  firstMessage?: string
  systemPrompt?: string
  services?: string[]
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
  knowledgeBase?: any
  status?: 'draft' | 'active' | 'paused' | 'archived' | 'error'
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
  mainGoal?: string
  voiceId?: string
  firstMessage?: string
  systemPrompt?: string
  services?: string[]
  serviceQuestions?: string[]
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

const resolvePromptAndVoice = (params: {
  companyName: string
  industry?: string
  useCase?: string
  services?: string[]
  serviceQuestions?: string[]
  mainGoal?: string
  firstMessage?: string
  systemPrompt?: string
  voiceId?: string
}) => {
  const {
    companyName,
    industry,
    useCase,
    services = [],
    serviceQuestions = [],
    mainGoal,
    firstMessage,
    systemPrompt,
    voiceId,
  } = params

  let prompt = systemPrompt || ''
  let greeting = firstMessage || ''
  let suggestedVoice = voiceId || ''

  if (!systemPrompt && industry && useCase) {
    const template = getAgentTemplate(industry, useCase, {
      companyName,
      services: services.join(', '),
      industry: industry.replace(/_/g, ' '),
    })

    prompt = template.systemPrompt
    greeting = greeting || template.firstMessage
    suggestedVoice = suggestedVoice || template.suggestedVoiceId

    const questions =
      serviceQuestions.length > 0
        ? serviceQuestions
        : template.keyServiceQuestions

    if (questions.length > 0) {
      prompt = `${prompt}\n\nPrioritize these discovery questions when relevant:\n- ${questions.join('\n- ')}`
    }
  }

  if (!prompt) {
    prompt = `You are a helpful AI agent for ${companyName}. Be professional, friendly, and aim to help callers resolve their issues or book appointments.`
  }

  if (mainGoal) {
    prompt = `${prompt}\n\nPrimary objective: ${mainGoal}`
  }

  if (!greeting) {
    greeting = `Hi, thanks for calling ${companyName}! How can I help you today?`
  }

  return { prompt, greeting, suggestedVoice }
}

const buildElevenLabsUpdatePayload = (updates: UpdateElevenLabsAgentParams) => {
  const elevenLabsUpdate: Record<string, any> = {}

  if (updates.name) {
    elevenLabsUpdate.name = updates.name
  }

  const conversationConfig: Record<string, any> = {}
  const agentConfig: Record<string, any> = {}
  const promptConfig: Record<string, any> = {}

  if (updates.systemPrompt !== undefined) {
    promptConfig.prompt = updates.systemPrompt
  }
  if (updates.llmModel !== undefined) {
    promptConfig.llm = updates.llmModel
  }
  if (updates.temperature !== undefined) {
    promptConfig.temperature = updates.temperature
  }
  if (updates.maxTokens !== undefined) {
    promptConfig.max_tokens = updates.maxTokens
  }
  if (updates.tools !== undefined) {
    promptConfig.tools = updates.tools
  }
  if (updates.knowledgeBase !== undefined) {
    promptConfig.knowledge_base = updates.knowledgeBase
  }

  if (Object.keys(promptConfig).length > 0) {
    agentConfig.prompt = promptConfig
  }

  if (updates.firstMessage !== undefined) {
    agentConfig.first_message = updates.firstMessage
  }
  if (updates.language !== undefined) {
    agentConfig.language = updates.language
  }
  if (updates.dataCollection !== undefined) {
    agentConfig.data_collection = updates.dataCollection
  }
  if (updates.evaluationCriteria !== undefined) {
    agentConfig.evaluation_criteria = updates.evaluationCriteria
  }

  if (Object.keys(agentConfig).length > 0) {
    conversationConfig.agent = agentConfig
  }

  const ttsConfig: Record<string, any> = {}
  if (updates.voiceId !== undefined) {
    ttsConfig.voice_id = updates.voiceId
  }
  if (updates.stability !== undefined) {
    ttsConfig.stability = updates.stability
  }
  if (updates.similarityBoost !== undefined) {
    ttsConfig.similarity_boost = updates.similarityBoost
  }
  if (updates.speed !== undefined) {
    ttsConfig.speed = updates.speed
  }
  if (Object.keys(ttsConfig).length > 0) {
    conversationConfig.tts = ttsConfig
  }

  if (updates.advanced?.maxCallDuration !== undefined) {
    conversationConfig.conversation = {
      ...conversationConfig.conversation,
      max_duration_seconds: updates.advanced.maxCallDuration,
    }
  }

  if (Object.keys(conversationConfig).length > 0) {
    elevenLabsUpdate.conversation_config = conversationConfig
  }

  return elevenLabsUpdate
}

export async function enqueueAgentProvisionRetry(
  payload: AgentProvisionRetryPayload,
) {
  const correlationId =
    (typeof payload.correlationId === 'string' && payload.correlationId) ||
    getRequestContext()?.correlationId ||
    payload.providerCorrelationKey

  return enqueueQueueJob(
    QUEUE_NAMES.INTEGRATION_SYNC,
    AGENT_PROVISION_RETRY_JOB_NAME,
    {
      ...payload,
      provider: 'elevenlabs',
      correlationId,
      idempotencyKey:
        payload.idempotencyKey ||
        `agent-provision:${payload.providerCorrelationKey}`,
    },
  )
}

export async function enqueueAgentUpdateRetry(
  payload: AgentUpdateRetryPayload,
) {
  const correlationId =
    (typeof payload.correlationId === 'string' && payload.correlationId) ||
    getRequestContext()?.correlationId ||
    null

  return enqueueQueueJob(
    QUEUE_NAMES.INTEGRATION_SYNC,
    AGENT_UPDATE_RETRY_JOB_NAME,
    {
      ...payload,
      provider: 'elevenlabs',
      correlationId,
      idempotencyKey:
        payload.idempotencyKey ||
        getUpdateIdempotencyKey(payload.agentId, payload.updates),
    },
  )
}

export async function createElevenLabsAgent(params: CreateAgentParams) {
  const {
    organizationId,
    companyName,
    name,
    industry,
    useCase,
    website,
    mainGoal,
    voiceId,
    firstMessage,
    systemPrompt,
    services = [],
    serviceQuestions = [],
  } = params

  const providerCorrelationKey =
    params.providerCorrelationKey ||
    `${organizationId}:${formatToSlug(name)}:${randomUUID()}`
  const correlationId = getRequestContext()?.correlationId || providerCorrelationKey

  const { prompt, greeting, suggestedVoice } = resolvePromptAndVoice({
    companyName,
    industry,
    useCase,
    services,
    serviceQuestions,
    mainGoal,
    firstMessage,
    systemPrompt,
    voiceId,
  })

  const client = getElevenLabsClient()

  await emitTransitionAuditEvent({
    organizationId,
    domain: 'provisioning',
    fromState: 'pending',
    toState: 'running',
    source: 'api',
    correlationId,
    reason: 'agent_provision_requested',
    metadata: {
      provider: 'elevenlabs',
      providerCorrelationKey,
    },
  })

  try {
    const elevenLabsAgent = await client.createAgent({
      name,
      conversation_config: {
        agent: {
          prompt: {
            prompt,
          },
          first_message: greeting,
          language: 'en',
        },
        tts: suggestedVoice
          ? {
              voice_id: suggestedVoice,
            }
          : undefined,
      },
    })

    logger.info(
      `Created ElevenLabs agent: ${elevenLabsAgent.agent_id} for org ${organizationId}`,
    )

    const persistedAgent = await createAgentRepo({
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
      status: 'active',
      syncPending: false,
      lastSyncAt: new Date(),
      lastSyncError: null,
      providerCorrelationKey,
    })

    await emitTransitionAuditEvent({
      organizationId,
      domain: 'provisioning',
      fromState: 'running',
      toState: 'completed',
      source: 'api',
      correlationId,
      reason: 'provider_agent_created',
      metadata: {
        provider: 'elevenlabs',
        agentId: persistedAgent.id,
        externalId: persistedAgent.externalId,
        externalType: persistedAgent.externalType,
      },
    })

    return persistedAgent
  } catch (error) {
    const errorMessage = getErrorMessage(error)

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
      status: 'error',
      syncPending: true,
      lastSyncAt: null,
      lastSyncError: errorMessage,
      providerCorrelationKey,
    })

    await emitTransitionAuditEvent({
      organizationId,
      domain: 'provisioning',
      fromState: 'running',
      toState: 'retry_queued',
      source: 'api',
      correlationId,
      reason: 'provider_unavailable_local_fallback',
      metadata: {
        provider: 'elevenlabs',
        agentId: fallbackAgent.id,
        fallbackExternalId: fallbackAgent.externalId,
        errorMessage,
      },
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
        mainGoal,
        voiceId: suggestedVoice || undefined,
        firstMessage: greeting,
        systemPrompt: prompt,
        services,
        serviceQuestions,
        providerCorrelationKey,
        correlationId,
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

  if (
    existingAgent.externalType === AgentExternalType.ELEVEN_LABS &&
    !existingAgent.syncPending
  ) {
    return existingAgent
  }

  const { prompt, greeting, suggestedVoice } = resolvePromptAndVoice({
    companyName: payload.companyName,
    industry: payload.industry,
    useCase: payload.useCase,
    services: payload.services,
    serviceQuestions: payload.serviceQuestions,
    mainGoal: payload.mainGoal,
    firstMessage: payload.firstMessage,
    systemPrompt: payload.systemPrompt,
    voiceId: payload.voiceId,
  })

  const client = getElevenLabsClient()
  const elevenLabsAgent = await client.createAgent({
    name: payload.name,
    conversation_config: {
      agent: {
        prompt: {
          prompt,
        },
        first_message: greeting,
        language: 'en',
      },
      tts: suggestedVoice
        ? {
            voice_id: suggestedVoice,
          }
        : undefined,
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
  const updatedAgent = await updateAgentRepo(payload.agentId, payload.organizationId, {
    externalId: elevenLabsAgent.agent_id,
    externalType: AgentExternalType.ELEVEN_LABS,
    voiceId: suggestedVoice || null,
    status: 'active',
    syncPending: false,
    lastSyncAt: new Date(),
    lastSyncError: null,
    providerCorrelationKey: payload.providerCorrelationKey,
  })

  await emitTransitionAuditEvent({
    organizationId: payload.organizationId,
    domain: 'provisioning',
    fromState: 'retry_queued',
    toState: 'completed',
    source: 'worker',
    correlationId:
      (typeof payload.correlationId === 'string' && payload.correlationId) ||
      payload.providerCorrelationKey,
    reason: 'retry_recovered_provider_agent',
    metadata: {
      agentId: updatedAgent.id,
      externalId: updatedAgent.externalId,
      provider: 'elevenlabs',
    },
  })

  return updatedAgent
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
        firstMessage: updates.firstMessage,
        systemPrompt: updates.systemPrompt,
        services: [],
        serviceQuestions: [],
        providerCorrelationKey:
          agent.providerCorrelationKey || `${organizationId}:${agentId}`,
        correlationId:
          getRequestContext()?.correlationId ||
          agent.providerCorrelationKey ||
          `${organizationId}:${agentId}`,
      })

      await emitTransitionAuditEvent({
        organizationId,
        domain: 'provisioning',
        fromState: 'completed',
        toState: 'retry_queued',
        source: options.fromRetryJob ? 'worker' : 'api',
        correlationId:
          getRequestContext()?.correlationId || agent.providerCorrelationKey,
        reason: 'fallback_agent_requires_reprovision',
        metadata: {
          agentId,
          provider: 'elevenlabs',
        },
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

    if (localUpdates.status === undefined) {
      localUpdates.status = 'active'
    }

    if (Object.keys(localUpdates).length > 0) {
      return await updateAgentRepo(agentId, organizationId, localUpdates)
    }

    return agent
  } catch (error) {
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

  const client = getElevenLabsClient()
  const voices = await client.listVoices()

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
  const agent = await findById(agentId, organizationId)

  const checkedAt = new Date().toISOString()

  if (agent.externalType === AgentExternalType.LOCAL_FALLBACK) {
    return {
      agentId: agent.id,
      organizationId: agent.organizationId,
      status: 'degraded',
      degradedMode: {
        enabled: true,
        reason: 'local_fallback_agent',
      },
      checks: {
        provider: {
          status: 'degraded',
          provider: AgentExternalType.ELEVEN_LABS,
          checkedAt,
          message: 'Agent is in local fallback mode and not provider-backed.',
        },
      },
    }
  }

  if (agent.syncPending || agent.status === 'error') {
    return {
      agentId: agent.id,
      organizationId: agent.organizationId,
      status: 'degraded',
      degradedMode: {
        enabled: true,
        reason: 'provider_unavailable',
      },
      checks: {
        provider: {
          status: 'degraded',
          provider: AgentExternalType.ELEVEN_LABS,
          checkedAt,
          message:
            agent.lastSyncError ||
            'Provider sync is pending due to a recent provider error.',
        },
      },
    }
  }

  try {
    const client = getElevenLabsClient()
    await client.getAgent(agent.externalId)

    return {
      agentId: agent.id,
      organizationId: agent.organizationId,
      status: 'healthy',
      degradedMode: {
        enabled: false,
        reason: null,
      },
      checks: {
        provider: {
          status: 'ok',
          provider: AgentExternalType.ELEVEN_LABS,
          checkedAt,
          message: 'Provider health check succeeded.',
        },
      },
    }
  } catch (error) {
    logger.warn(
      { error, agentId: agent.id },
      'Agent provider health check failed',
    )

    return {
      agentId: agent.id,
      organizationId: agent.organizationId,
      status: 'degraded',
      degradedMode: {
        enabled: true,
        reason: 'provider_unavailable',
      },
      checks: {
        provider: {
          status: 'degraded',
          provider: AgentExternalType.ELEVEN_LABS,
          checkedAt,
          message: 'Provider health check failed.',
        },
      },
    }
  }
}
