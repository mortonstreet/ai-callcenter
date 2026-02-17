import {
  ElevenLabsWebhook,
  AgentExternalType,
  CallQuality,
  PipelineStage,
} from '@shared/types/src'
import {
  createRecording,
  findAgentByExternalId,
  findTaskInstanceByConversationId,
  findFirstTaskByAgentId,
  createTask as createTaskRepository,
} from '@/repositories/agent.repository'
import { createTaskInstance } from '@/repositories/organization.repository'
import logger from '@/lib/logger'

const MIN_PRODUCTIVE_DURATION_SECS = 15
export const ELEVENLABS_WEBHOOK_RETRY_JOB_NAME = 'elevenlabs-webhook-retry'

interface CallQualityResult {
  quality: CallQuality
  reason: string
}

const classifyCallQuality = (
  durationSecs: number,
  transcriptSummary: string | null,
): CallQualityResult => {
  if (durationSecs < MIN_PRODUCTIVE_DURATION_SECS) {
    return {
      quality: CallQuality.SHORT_CALL,
      reason: `Call duration (${durationSecs}s) is under ${MIN_PRODUCTIVE_DURATION_SECS}s threshold`,
    }
  }

  const summaryLower = (transcriptSummary || '').toLowerCase()

  const robocallIndicators = [
    'automated',
    'press 1',
    'recording',
    'robot',
    'robo',
  ]

  if (robocallIndicators.some((i) => summaryLower.includes(i))) {
    return {
      quality: CallQuality.ROBOCALL,
      reason: 'Robocall indicators detected',
    }
  }

  const noConvoIndicators = [
    'no response',
    'hung up',
    'disconnected',
    'silence',
    'no audio',
  ]

  if (noConvoIndicators.some((i) => summaryLower.includes(i))) {
    return {
      quality: CallQuality.NO_CONVERSATION,
      reason: 'No meaningful conversation',
    }
  }

  const spamIndicators = ['wrong number', 'prank', 'spam', 'test call']
  if (spamIndicators.some((i) => summaryLower.includes(i))) {
    return {
      quality: CallQuality.SPAM,
      reason: 'Spam/prank call detected',
    }
  }

  return {
    quality: CallQuality.PRODUCTIVE,
    reason: 'Productive call with real conversation',
  }
}

export const isProcessableElevenLabsWebhookType = (
  eventType: string,
): boolean => {
  return (
    eventType === 'conversation.ended' ||
    eventType === 'post_call_transcription'
  )
}

export async function processElevenLabsConversationWebhook(
  webhook: ElevenLabsWebhook,
) {
  logger.info(
    { agentExternalId: webhook.data.agent_id, conversationId: webhook.data.conversation_id },
    'Processing ElevenLabs webhook',
  )

  const agent = await findAgentByExternalId(
    webhook.data.agent_id,
    AgentExternalType.ELEVEN_LABS,
  )

  if (!agent) {
    throw new Error(
      `Agent not found for ElevenLabs agent_id: ${webhook.data.agent_id}`,
    )
  }

  logger.info({ agentId: agent.id, agentName: agent.name }, 'Found agent for webhook')

  let taskInstance = await findTaskInstanceByConversationId(
    webhook.data.conversation_id,
    agent.organizationId,
  )

  // If no TaskInstance exists for this conversation, create one as a new lead
  if (!taskInstance) {
    logger.info('No existing task instance found, creating new lead')

    let task = await findFirstTaskByAgentId(agent.id, agent.organizationId)

    if (!task) {
      task = await createTaskRepository({
        name: 'Inbound Calls',
        description: 'Default task for inbound call leads',
        agentId: agent.id,
        organizationId: agent.organizationId,
        requiredInfo: JSON.stringify([]),
        dispatcherUserId: null,
      })
      logger.info(
        `Created default task "${task.name}" for agent ${agent.name} (${agent.id})`,
      )
    }

    const phoneCall = webhook.data.metadata?.phone_call as
      | { from_number?: string; call_sid?: string }
      | null
      | undefined
    const callerPhone = phoneCall?.from_number || null

    taskInstance = await createTaskInstance({
      taskId: task.id,
      status: 'pending',
      requiredInfo: task.requiredInfo,
      info: JSON.stringify(callerPhone ? { 'phone-number': callerPhone } : {}),
      conversationId: webhook.data.conversation_id,
      callSid: phoneCall?.call_sid || webhook.data.conversation_id,
      dispatcherId: null,
      organizationId: agent.organizationId,
      pipelineStage: PipelineStage.NEW,
      pipelineStageId: null,
      leadType: null,
      resolutionType: null,
      customerType: null,
      leadScore: null,
      estimatedValue: null,
      calcomBookingId: null,
      calcomEventId: null,
      appointmentTime: null,
      bookingStatus: null,
      bookingCancelledAt: null,
      bookingCancelReason: null,
      tags: null,
    })

    logger.info(
      { taskInstanceId: taskInstance.id, conversationId: webhook.data.conversation_id },
      'Created new lead (TaskInstance)',
    )
  }

  const callDuration = webhook.data.metadata?.call_duration_secs || 0
  const transcriptSummary = webhook.data.analysis?.transcript_summary || null
  const qualityResult = classifyCallQuality(callDuration, transcriptSummary)

  logger.info(
    { quality: qualityResult.quality, reason: qualityResult.reason },
    'Call quality classified',
  )

  const recording = await createRecording({
    conversationId: webhook.data.conversation_id,
    callSid:
      webhook.data.metadata?.phone_call?.call_sid ||
      webhook.data.conversation_id,
    taskInstanceId: taskInstance.id,
    organizationId: agent.organizationId,
    callDurationSeconds: callDuration,
    cost: webhook.data.metadata?.cost || 0,
    transcriptSummary,
    payload: webhook as any,
    callQuality: qualityResult.quality,
    callQualityReason: qualityResult.reason,
  })

  logger.info({ recordingId: recording.id }, 'Recording created successfully')

  return {
    recording,
    quality: qualityResult,
    organizationId: agent.organizationId,
  }
}
