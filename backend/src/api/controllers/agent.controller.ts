import { AuthRequestHandler, ValidatedRequestHandler } from '@/types/handlers'
import {
  GetAgentsRequest,
  GetAgentRequest,
  ElevenLabsWebhook,
  CreateTaskRequest,
  CreateAgentRequest,
  DeleteAgentRequest,
  GetTasksRequest,
  UpdateTaskRequest,
  DeleteTaskRequest,
  CreateElevenLabsAgentRequest,
  UpdateElevenLabsAgentRequest,
  OwnerUpdateAgentRequest,
  DeleteElevenLabsAgentRequest,
  GetAgentConfigRequest,
  GetAgentAnalyticsRequest,
  GetAgentConversationsRequest,
  GetAgentHealthRequest,
  AgentDegradedModeMetadata,
} from '@shared/types/src'
import {
  findAllByOrganizationId,
  findById as findAgentById,
  createAgent as createAgentRepo,
  deleteAgent as deleteAgentRepo,
  createTask as createTaskRepository,
  getAgentTasks,
  updateTask as updateTaskRepository,
  deleteTask as deleteTaskRepository,
  updateAgentMcpCredentials,
  findTaskInstanceByBookingId,
  updateTaskInstanceBookingStatus,
} from '@/repositories/agent.repository'
import { formatTaskFields } from '@/utils/task'
import { formatToSlug } from '@/utils'
import logger from '@/lib/logger'
import {
  AgentExternalType,
  PipelineStage,
  CallQuality,
} from '@shared/types/src'
import { getElevenLabsClient } from '@/clients/elevenlabs.client'
import { randomBytes } from 'crypto'
import { Request, Response } from 'express'
import { enqueueQueueJob } from '@/queues'
import { QUEUE_NAMES } from '@/types/queues'
import { createAdminAuditLog } from '@/repositories/governance.repository'
import { findById as findOrganizationById } from '@/repositories/organization.repository'
import {
  isProcessableElevenLabsWebhookType,
  processElevenLabsConversationWebhook,
  ELEVENLABS_WEBHOOK_RETRY_JOB_NAME,
} from '@/services/agent-webhook.service'
import {
  createElevenLabsAgent as createElevenLabsAgentService,
  updateElevenLabsAgent as updateElevenLabsAgentService,
  deleteElevenLabsAgent as deleteElevenLabsAgentService,
  getElevenLabsAgentConfig as getElevenLabsAgentConfigService,
  getVoices as getVoicesService,
  getAgentAnalytics as getAgentAnalyticsService,
  getAgentConversations as getAgentConversationsService,
  getAgentHealth as getAgentHealthService,
} from '@/services/agent.service'

const getAgentDegradedModeMetadata = (agent: {
  externalType: string
  syncPending?: boolean | null
  status?: string | null
}): AgentDegradedModeMetadata => {
  if (agent.externalType === AgentExternalType.LOCAL_FALLBACK) {
    return {
      enabled: true,
      reason: 'local_fallback_agent',
    }
  }
  if (agent.syncPending || agent.status === 'error') {
    return {
      enabled: true,
      reason: 'provider_unavailable',
    }
  }
  return {
    enabled: false,
    reason: null,
  }
}

const withAgentContractMetadata = <
  T extends {
    externalType: string
    syncPending?: boolean | null
    status?: string | null
  },
>(
  agent: T,
) => ({
  ...agent,
  degradedMode: getAgentDegradedModeMetadata(agent),
})

export const getAgents: AuthRequestHandler<GetAgentsRequest> = async (
  req,
  res,
) => {
  const { organizationId } = req.validated
  const agents = await findAllByOrganizationId(organizationId)
  res.json(agents.map((agent) => withAgentContractMetadata(agent)))
}

export const getAgent: AuthRequestHandler<GetAgentRequest> = async (
  req,
  res,
) => {
  const { id, organizationId } = req.validated
  const agent = await findAgentById(id, organizationId)
  res.json(withAgentContractMetadata(agent))
}

export const createAgent: AuthRequestHandler<CreateAgentRequest> = async (
  req,
  res,
) => {
  const { organizationId, name, firstMessage, prompt } = req.validated

  const elevenLabsClient = getElevenLabsClient(process.env.ELEVEN_LABS_API_KEY)
  const elevenLabsAgent = await elevenLabsClient.createAgent({
    name,
    conversation_config: {
      agent: {
        first_message: firstMessage,
        language: 'en',
        prompt: { prompt },
      },
    },
  })

  logger.info(
    `Created ElevenLabs agent ${elevenLabsAgent.agent_id} for org ${organizationId}`,
  )

  const agent = await createAgentRepo({
    name,
    slug: formatToSlug(name),
    organizationId,
    phoneNumber: '',
    redirectNumber: '',
    externalId: elevenLabsAgent.agent_id,
    externalType: AgentExternalType.ELEVEN_LABS,
    mcpApiKey: null,
    webhookSecret: null,
    mcpEndpointUrl: null,
  })

  res.json(agent)
}

export const deleteAgent: AuthRequestHandler<DeleteAgentRequest> = async (
  req,
  res,
) => {
  const { id, organizationId } = req.validated

  const agent = await findAgentById(id, organizationId)
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' })
  }

  // Delete from ElevenLabs first
  try {
    const elevenLabsClient = getElevenLabsClient(
      process.env.ELEVEN_LABS_API_KEY,
    )
    await elevenLabsClient.deleteAgent(agent.externalId)
    logger.info(`Deleted ElevenLabs agent ${agent.externalId}`)
  } catch (error) {
    logger.error(
      `Failed to delete ElevenLabs agent ${agent.externalId}:`,
      error,
    )
    // Continue with DB deletion even if ElevenLabs fails
  }

  const deleted = await deleteAgentRepo(id, organizationId)
  logger.info(`Deleted agent ${agent.name} (${id}) from org ${organizationId}`)

  res.json(deleted)
}

export const createTask: AuthRequestHandler<CreateTaskRequest> = async (
  req,
  res,
) => {
  const {
    name,
    description,
    fields,
    organizationId,
    agentId,
    dispatcherUserId,
  } = req.validated
  const agent = await findAgentById(agentId, organizationId)
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' })
  }
  const task = await createTaskRepository({
    name,
    description: description || null,
    organizationId,
    agentId,
    dispatcherUserId: dispatcherUserId || null,
    requiredInfo: JSON.stringify(formatTaskFields(fields)),
  })
  res.json(task)
}

export const getTasks: AuthRequestHandler<GetTasksRequest> = async (
  req,
  res,
) => {
  const { agentId, organizationId } = req.validated
  const tasks = await getAgentTasks(agentId, organizationId)
  res.json(tasks)
}

export const updateTask: AuthRequestHandler<UpdateTaskRequest> = async (
  req,
  res,
) => {
  const {
    id,
    name,
    description,
    fields,
    organizationId,
    agentId,
    dispatcherUserId,
  } = req.validated
  const task = await updateTaskRepository(id, {
    name,
    description: description || null,
    dispatcherUserId: dispatcherUserId || null,
    requiredInfo: JSON.stringify(formatTaskFields(fields)),
  })
  res.json(task)
}

export const deleteTask: AuthRequestHandler<DeleteTaskRequest> = async (
  req,
  res,
) => {
  const { id, organizationId } = req.validated
  const task = await deleteTaskRepository(id, organizationId)
  res.json(task)
}

export const agentWebhook: ValidatedRequestHandler<ElevenLabsWebhook> = async (
  req,
  res,
) => {
  const webhook = req.validated

  logger.info(
    `Received webhook type: ${webhook.type} for conversation: ${webhook.data.conversation_id}`,
  )

  if (!isProcessableElevenLabsWebhookType(webhook.type)) {
    logger.info(`Ignoring webhook type: ${webhook.type}`)
    return res.json({
      success: true,
      message: `Webhook type ${webhook.type} acknowledged`,
    })
  }

  try {
    const { recording } = await processElevenLabsConversationWebhook(webhook)
    return res.json({ success: true, recordingId: recording.id })
  } catch (error) {
    logger.error({ error }, 'Error processing ElevenLabs webhook directly')

    try {
      await enqueueQueueJob(
        QUEUE_NAMES.WEBHOOK_INGEST,
        ELEVENLABS_WEBHOOK_RETRY_JOB_NAME,
        {
          webhookPayload: webhook,
          organizationId: undefined,
          idempotencyKey: `webhook:${webhook.type}:${webhook.data.conversation_id}`,
        },
      )
      return res.status(202).json({
        success: false,
        queued: true,
        message: 'Webhook processing deferred for retry',
      })
    } catch (queueError) {
      logger.error(
        { queueError, webhookType: webhook.type },
        'Failed to queue webhook retry',
      )
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}

// Generate a secure random key
const generateSecureKey = (prefix: string = ''): string => {
  const bytes = randomBytes(32)
  return `${prefix}${bytes.toString('hex')}`
}

// Update agent MCP credentials
export const updateAgentMcpConfig: AuthRequestHandler<{
  id: string
  organizationId: string
  mcpApiKey?: string | null
  webhookSecret?: string | null
  mcpEndpointUrl?: string | null
  generateNewApiKey?: boolean
  generateNewWebhookSecret?: boolean
}> = async (req, res) => {
  const {
    id,
    organizationId,
    mcpApiKey,
    webhookSecret,
    mcpEndpointUrl,
    generateNewApiKey,
    generateNewWebhookSecret,
  } = req.validated

  // Verify the agent exists and belongs to the organization
  const agent = await findAgentById(id, organizationId)
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' })
  }

  // Build the update payload
  const updates: {
    mcpApiKey?: string | null
    webhookSecret?: string | null
    mcpEndpointUrl?: string | null
  } = {}

  if (generateNewApiKey) {
    updates.mcpApiKey = generateSecureKey('mcp_')
  } else if (mcpApiKey !== undefined) {
    updates.mcpApiKey = mcpApiKey
  }

  if (generateNewWebhookSecret) {
    updates.webhookSecret = generateSecureKey('wsec_')
  } else if (webhookSecret !== undefined) {
    updates.webhookSecret = webhookSecret
  }

  if (mcpEndpointUrl !== undefined) {
    updates.mcpEndpointUrl = mcpEndpointUrl
  }

  const updatedAgent = await updateAgentMcpCredentials(id, updates)

  logger.info(`Updated MCP config for agent ${agent.name} (${id})`)

  try {
    await createAdminAuditLog({
      organizationId,
      actorUserId: req.user.id,
      action:
        generateNewApiKey || generateNewWebhookSecret
          ? 'agent.mcp_credentials_rotated'
          : 'agent.mcp_config_updated',
      resourceType: 'agent',
      resourceId: id,
      before: {
        hasMcpApiKey: !!agent.mcpApiKey,
        hasWebhookSecret: !!agent.webhookSecret,
        mcpEndpointUrl: agent.mcpEndpointUrl,
      },
      after: {
        hasMcpApiKey: !!updatedAgent.mcpApiKey,
        hasWebhookSecret: !!updatedAgent.webhookSecret,
        mcpEndpointUrl: updatedAgent.mcpEndpointUrl,
      },
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null,
    })
  } catch (auditError) {
    logger.warn(
      { auditError, agentId: id, organizationId },
      'Failed to persist MCP audit log entry',
    )
  }

  res.json({
    id: updatedAgent.id,
    name: updatedAgent.name,
    mcpApiKey: updatedAgent.mcpApiKey,
    webhookSecret: updatedAgent.webhookSecret,
    mcpEndpointUrl: updatedAgent.mcpEndpointUrl,
    mcpEndpoint: `/api/mcp/sse`, // The universal MCP endpoint
    webhookEndpoint: `/api/webhook/agent/elevenlabs`, // The webhook endpoint
  })
}

// Get agent MCP config (without sensitive data exposure for non-admins)
export const getAgentMcpConfig: AuthRequestHandler<{
  id: string
  organizationId: string
}> = async (req, res) => {
  const { id, organizationId } = req.validated

  const agent = await findAgentById(id, organizationId)
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' })
  }

  res.json({
    id: agent.id,
    name: agent.name,
    hasMcpApiKey: !!agent.mcpApiKey,
    hasWebhookSecret: !!agent.webhookSecret,
    mcpEndpointUrl: agent.mcpEndpointUrl,
    // Only expose keys if they exist (admin use case - implement proper auth check if needed)
    mcpApiKey: agent.mcpApiKey,
    webhookSecret: agent.webhookSecret,
    mcpEndpoint: `/api/mcp/sse`,
    webhookEndpoint: `/api/webhook/agent/elevenlabs`,
  })
}

// ===== ElevenLabs Agent Management =====

export const createElevenLabsAgent: AuthRequestHandler<
  CreateElevenLabsAgentRequest
> = async (req, res) => {
  const {
    organizationId,
    name,
    industry,
    useCase,
    website,
    mainGoal,
    voiceId,
    firstMessage,
    systemPrompt,
  } = req.validated

  try {
    const organization = await findOrganizationById(organizationId)

    const agent = await createElevenLabsAgentService({
      organizationId,
      companyName: organization.name,
      name,
      industry,
      useCase,
      website,
      mainGoal,
      voiceId,
      firstMessage,
      systemPrompt,
    })

    res.json(withAgentContractMetadata(agent))
  } catch (error) {
    logger.error('Failed to create ElevenLabs agent:', error)
    res.status(500).json({ error: 'Failed to create agent' })
  }
}

export const updateElevenLabsAgent: AuthRequestHandler<
  UpdateElevenLabsAgentRequest
> = async (req, res) => {
  const { id, organizationId, ...updates } = req.validated

  try {
    const agent = await updateElevenLabsAgentService(
      id,
      organizationId,
      updates,
    )
    res.json(withAgentContractMetadata(agent))
  } catch (error) {
    logger.error('Failed to update ElevenLabs agent:', error)
    res.status(500).json({ error: 'Failed to update agent' })
  }
}

export const ownerUpdateAgent: AuthRequestHandler<
  OwnerUpdateAgentRequest
> = async (req, res) => {
  const { id, organizationId, ...updates } = req.validated

  try {
    const agent = await updateElevenLabsAgentService(
      id,
      organizationId,
      updates,
    )
    res.json(withAgentContractMetadata(agent))
  } catch (error) {
    logger.error('Failed to update agent (owner):', error)
    res.status(500).json({ error: 'Failed to update agent' })
  }
}

export const deleteElevenLabsAgent: AuthRequestHandler<
  DeleteElevenLabsAgentRequest
> = async (req, res) => {
  const { id, organizationId } = req.validated

  try {
    const agent = await deleteElevenLabsAgentService(id, organizationId)
    res.json({ success: true, agent })
  } catch (error) {
    logger.error('Failed to delete ElevenLabs agent:', error)
    res.status(500).json({ error: 'Failed to delete agent' })
  }
}

export const getAgentConfig: AuthRequestHandler<GetAgentConfigRequest> = async (
  req,
  res,
) => {
  const { id, organizationId } = req.validated

  try {
    const agent = await findAgentById(id, organizationId)
    if (agent.externalType === AgentExternalType.LOCAL_FALLBACK) {
      return res.json({
        id: agent.id,
        name: agent.name,
        provider: AgentExternalType.LOCAL_FALLBACK,
        degradedMode: {
          enabled: true,
          reason: 'local_fallback_agent',
        },
        syncPending: agent.syncPending,
        lastSyncError: agent.lastSyncError,
      })
    }

    const config = await getElevenLabsAgentConfigService(agent.externalId)
    return res.json(config)
  } catch (error) {
    logger.error('Failed to get agent config:', error)
    return res.status(500).json({ error: 'Failed to get agent config' })
  }
}

export const listVoices: AuthRequestHandler<Record<string, never>> = async (
  _req,
  res,
) => {
  try {
    const voices = await getVoicesService()
    res.json(voices)
  } catch (error) {
    logger.error('Failed to list voices:', error)
    res.status(500).json({ error: 'Failed to list voices' })
  }
}

export const getAgentAnalytics: AuthRequestHandler<
  GetAgentAnalyticsRequest
> = async (req, res) => {
  const { id, organizationId, startDate, endDate, granularity } = req.validated

  try {
    const analytics = await getAgentAnalyticsService(
      id,
      organizationId,
      startDate,
      endDate,
      granularity,
    )
    res.json(analytics)
  } catch (error) {
    logger.error('Failed to get agent analytics:', error)
    res.status(500).json({ error: 'Failed to get analytics' })
  }
}

export const getAgentConversations: AuthRequestHandler<
  GetAgentConversationsRequest
> = async (req, res) => {
  const { id, organizationId, pageSize } = req.validated

  try {
    const conversations = await getAgentConversationsService(
      id,
      organizationId,
      pageSize,
    )
    res.json(conversations)
  } catch (error) {
    logger.error('Failed to get agent conversations:', error)
    res.status(500).json({ error: 'Failed to get conversations' })
  }
}

export const getAgentHealth: AuthRequestHandler<GetAgentHealthRequest> = async (
  req,
  res,
) => {
  const { id, organizationId } = req.validated

  try {
    const health = await getAgentHealthService(id, organizationId)
    return res.json(health)
  } catch (error) {
    logger.error('Failed to get agent health:', error)
    return res.status(500).json({ error: 'Failed to get agent health' })
  }
}

// Cal.com webhook types
interface CalComWebhookPayload {
  triggerEvent:
    | 'BOOKING_CREATED'
    | 'BOOKING_CANCELLED'
    | 'BOOKING_RESCHEDULED'
    | 'BOOKING_CONFIRMED'
    | 'BOOKING_REJECTED'
  createdAt: string
  payload: {
    uid: string
    bookingId?: number
    eventTypeId?: number
    title?: string
    startTime?: string
    endTime?: string
    cancellationReason?: string
    status?: string
    attendees?: Array<{
      email: string
      name: string
      phone?: string
    }>
    metadata?: Record<string, string>
  }
}

// Cal.com webhook handler for booking events
export const calcomWebhook = async (req: Request, res: Response) => {
  const webhook = req.body as CalComWebhookPayload

  logger.info(`📅 Cal.com webhook received: ${webhook.triggerEvent}`, {
    bookingUid: webhook.payload?.uid,
    status: webhook.payload?.status,
  })

  try {
    const bookingUid = webhook.payload?.uid

    if (!bookingUid) {
      logger.warn('Cal.com webhook missing booking UID')
      return res.status(400).json({ error: 'Missing booking UID' })
    }

    // Find the task instance linked to this booking
    const taskInstance = await findTaskInstanceByBookingId(bookingUid)

    if (!taskInstance) {
      logger.warn(`No task instance found for Cal.com booking: ${bookingUid}`)
      // Still return success - booking might not be from our system
      return res.json({
        success: true,
        message: 'Booking not linked to any lead',
      })
    }

    switch (webhook.triggerEvent) {
      case 'BOOKING_CANCELLED': {
        logger.info(`📅 Booking CANCELLED: ${bookingUid}`)

        await updateTaskInstanceBookingStatus(taskInstance.id, {
          bookingStatus: 'cancelled',
          bookingCancelledAt: new Date(),
          bookingCancelReason: webhook.payload.cancellationReason || null,
          // Move to follow_up stage when cancelled - needs re-engagement
          pipelineStage: PipelineStage.FOLLOW_UP,
        })

        return res.json({
          success: true,
          message: 'Booking cancelled, lead moved to follow-up',
          taskInstanceId: taskInstance.id,
        })
      }

      case 'BOOKING_RESCHEDULED': {
        logger.info(`📅 Booking RESCHEDULED: ${bookingUid}`)

        await updateTaskInstanceBookingStatus(taskInstance.id, {
          bookingStatus: 'rescheduled',
          appointmentTime: webhook.payload.startTime
            ? new Date(webhook.payload.startTime)
            : null,
          // Stay in booked stage
          pipelineStage: PipelineStage.BOOKED,
        })

        return res.json({
          success: true,
          message: 'Booking rescheduled',
          taskInstanceId: taskInstance.id,
          newTime: webhook.payload.startTime,
        })
      }

      case 'BOOKING_CONFIRMED': {
        logger.info(`📅 Booking CONFIRMED: ${bookingUid}`)

        await updateTaskInstanceBookingStatus(taskInstance.id, {
          bookingStatus: 'confirmed',
          pipelineStage: PipelineStage.BOOKED,
        })

        return res.json({
          success: true,
          message: 'Booking confirmed',
          taskInstanceId: taskInstance.id,
        })
      }

      case 'BOOKING_REJECTED': {
        logger.info(`📅 Booking REJECTED: ${bookingUid}`)

        await updateTaskInstanceBookingStatus(taskInstance.id, {
          bookingStatus: 'cancelled',
          bookingCancelledAt: new Date(),
          bookingCancelReason: 'Booking rejected',
          pipelineStage: PipelineStage.FOLLOW_UP,
        })

        return res.json({
          success: true,
          message: 'Booking rejected, lead moved to follow-up',
          taskInstanceId: taskInstance.id,
        })
      }

      default: {
        logger.info(`📅 Unhandled Cal.com event: ${webhook.triggerEvent}`)
        return res.json({
          success: true,
          message: `Event ${webhook.triggerEvent} acknowledged`,
        })
      }
    }
  } catch (error) {
    logger.error('Error processing Cal.com webhook:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
