import { AuthRequestHandler, ValidatedRequestHandler } from '@/types/handlers'
import {
  GetAgentsRequest,
  GetAgentRequest,
  ElevenLabsWebhook,
  CreateTaskRequest,
  GetTasksRequest,
  UpdateTaskRequest,
  DeleteTaskRequest,
} from '@shared/types/src'
import {
  findAllByOrganizationId,
  findById as findAgentById,
  createTask as createTaskRepository,
  getAgentTasks,
  updateTask as updateTaskRepository,
  deleteTask as deleteTaskRepository,
  createRecording,
  findAgentByExternalId,
  findTaskInstanceByConversationId,
} from '@/repositories/agent.repository'
import { formatTaskFields } from '@/utils/task'
import logger from '@/lib/logger'
import { AgentExternalType } from '@shared/types/src'

export const getAgents: AuthRequestHandler<GetAgentsRequest> = async (
  req,
  res,
) => {
  const { organizationId } = req.validated
  const agents = await findAllByOrganizationId(organizationId)
  res.json(agents)
}

export const getAgent: AuthRequestHandler<GetAgentRequest> = async (
  req,
  res,
) => {
  const { id, organizationId } = req.validated
  const agent = await findAgentById(id, organizationId)
  res.json(agent)
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

  try {
    // Find the agent in our system by ElevenLabs agent_id
    const agent = await findAgentByExternalId(
      webhook.data.agent_id,
      AgentExternalType.ELEVEN_LABS,
    )

    if (!agent) {
      logger.warn(
        `Agent not found for ElevenLabs agent_id: ${webhook.data.agent_id}`,
      )
      return res.status(404).json({ error: 'Agent not found' })
    }

    const taskInstance = await findTaskInstanceByConversationId(
      webhook.data.conversation_id,
      agent.organizationId,
    )

    // Create the recording
    const recording = await createRecording({
      conversationId: webhook.data.conversation_id,
      callSid:
        webhook.data.metadata.phone_call?.call_sid ||
        webhook.data.conversation_id, // Fallback to conversationId if no callSid
      taskInstanceId: taskInstance?.id || null,
      organizationId: agent.organizationId,
      callDurationSeconds: webhook.data.metadata.call_duration_secs,
      cost: webhook.data.metadata.cost,
      transcriptSummary: webhook.data.analysis.transcript_summary || null,
      payload: webhook as any, // Store the entire webhook
    })

    logger.info(
      `Created recording ${recording.id} for conversation ${webhook.data.conversation_id}`,
    )

    res.json({ success: true, recordingId: recording.id })
  } catch (error) {
    logger.error('Error processing webhook', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
