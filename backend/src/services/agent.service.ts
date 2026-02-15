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

// Voice cache
let voicesCache: { data: any; timestamp: number } | null = null
const VOICE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

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
  } = params

  const client = getElevenLabsClient()

  // Get template based on industry/use case, or use provided prompt
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
  }

  if (!prompt) {
    prompt = `You are a helpful AI agent for ${companyName}. Be professional, friendly, and aim to help callers resolve their issues or book appointments.`
  }
  if (!greeting) {
    greeting = `Hi, thanks for calling ${companyName}! How can I help you today?`
  }

  // Create agent on ElevenLabs
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

  // Create local DB record
  const agent = await createAgentRepo({
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
  })

  return agent
}

export async function updateElevenLabsAgent(
  agentId: string,
  organizationId: string,
  updates: {
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
    advanced?: {
      maxConcurrentCalls?: number
      maxCallDuration?: number
      silenceEndCallTimeout?: number
      turnTimeout?: number
      postCallWebhookUrl?: string
    }
  },
) {
  const agent = await findById(agentId, organizationId)
  const client = getElevenLabsClient()

  // Build the ElevenLabs update payload
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

  // TTS config
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

  // Conversation config
  if (updates.advanced?.maxCallDuration !== undefined) {
    conversationConfig.conversation = {
      ...conversationConfig.conversation,
      max_duration_seconds: updates.advanced.maxCallDuration,
    }
  }

  if (Object.keys(conversationConfig).length > 0) {
    elevenLabsUpdate.conversation_config = conversationConfig
  }

  // Send update to ElevenLabs if there are changes
  if (Object.keys(elevenLabsUpdate).length > 0) {
    await client.updateAgent(agent.externalId, elevenLabsUpdate)
    logger.info(`Updated ElevenLabs agent: ${agent.externalId}`)
  }

  // Update local DB
  const localUpdates: Record<string, any> = {}
  if (updates.name) localUpdates.name = updates.name
  if (updates.name) localUpdates.slug = formatToSlug(updates.name)
  if (updates.voiceId !== undefined) localUpdates.voiceId = updates.voiceId

  if (Object.keys(localUpdates).length > 0) {
    return await updateAgentRepo(agentId, organizationId, localUpdates)
  }

  return agent
}

export async function deleteElevenLabsAgent(
  agentId: string,
  organizationId: string,
) {
  const agent = await findById(agentId, organizationId)
  const client = getElevenLabsClient()

  // Delete from ElevenLabs
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

  // Delete local DB record
  return await deleteAgentRepo(agentId, organizationId)
}

export async function getElevenLabsAgentConfig(externalId: string) {
  const client = getElevenLabsClient()
  return await client.getAgent(externalId)
}

export async function getVoices() {
  // Check cache
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

  return {
    aggregates,
    timeSeries,
  }
}

export async function getAgentConversations(
  agentId: string,
  organizationId: string,
  pageSize: number = 50,
) {
  const agent = await findById(agentId, organizationId)
  const client = getElevenLabsClient()

  const conversations = await client.listConversations(
    agent.externalId,
    pageSize,
  )

  return conversations
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
