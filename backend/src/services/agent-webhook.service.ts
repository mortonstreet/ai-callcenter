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
import {
  createTaskInstance,
  updateTaskInstance,
} from '@/repositories/organization.repository'
import * as leadRepository from '@/repositories/lead.repository'
import { linkLeadToCallLog } from '@/repositories/call-center.repository'
import { findDefaultByOrganizationId as findDefaultPipelineStage } from '@/repositories/pipeline.repository'
import logger from '@/lib/logger'
import { normalizePhone } from '@/utils/phone'

interface ExtractedLeadFields {
  firstName: string | null
  lastName: string | null
  phone: string | null
  normalizedPhone: string | null
  email: string | null
  serviceNeeded: string | null
  address: string | null
  preferredTimeWindow: string | null
}

/**
 * Extract structured lead fields from the ElevenLabs webhook payload.
 * Uses analysis.data_collection_results (structured key/value pairs configured
 * on the ElevenLabs agent) and falls back to metadata.phone_call.from_number
 * for the phone field.
 */
function extractLeadFieldsFromWebhook(
  webhook: import('@shared/types/src').ElevenLabsWebhook,
): ExtractedLeadFields {
  const dataCollection = (webhook.data.analysis?.data_collection_results ??
    {}) as Record<string, { value: string; rationale?: string } | string | null>
  const phoneCall = webhook.data.metadata?.phone_call as
    | { from_number?: string; call_sid?: string }
    | null
    | undefined

  const dcVal = (key: string): string | null => {
    const entry = dataCollection[key]
    if (!entry) return null
    if (typeof entry === 'string') return entry.trim() || null
    if (typeof entry === 'object' && 'value' in entry) {
      const v = entry.value
      return typeof v === 'string' && v.trim() ? v.trim() : null
    }
    return null
  }

  const rawName =
    dcVal('customer_name') ??
    dcVal('caller_name') ??
    dcVal('name') ??
    dcVal('full_name')
  let firstName: string | null = null
  let lastName: string | null = null
  if (rawName) {
    const parts = rawName.split(/\s+/)
    firstName = parts[0] || null
    lastName = parts.length > 1 ? parts.slice(1).join(' ') : null
  }

  const rawPhone =
    dcVal('customer_phone') ??
    dcVal('phone_number') ??
    dcVal('phone') ??
    phoneCall?.from_number ??
    null
  const normalized = normalizePhone(rawPhone)

  const email =
    dcVal('customer_email') ?? dcVal('email_address') ?? dcVal('email')

  const serviceNeeded =
    dcVal('service_needed') ??
    dcVal('service_type') ??
    dcVal('service_requested') ??
    dcVal('reason_for_call')

  const address =
    dcVal('customer_address') ?? dcVal('service_address') ?? dcVal('address')

  const preferredTimeWindow =
    dcVal('preferred_time') ??
    dcVal('preferred_date') ??
    dcVal('requested_date') ??
    dcVal('preferred_time_window')

  return {
    firstName,
    lastName,
    phone: rawPhone,
    normalizedPhone: normalized,
    email,
    serviceNeeded,
    address,
    preferredTimeWindow,
  }
}

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
    {
      agentExternalId: webhook.data.agent_id,
      conversationId: webhook.data.conversation_id,
    },
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

  logger.info(
    { agentId: agent.id, agentName: agent.name },
    'Found agent for webhook',
  )

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
      leadId: null,
    })

    logger.info(
      {
        taskInstanceId: taskInstance.id,
        conversationId: webhook.data.conversation_id,
      },
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

  // Extract structured lead fields, upsert a Lead, and link to call_log
  try {
    const extracted = extractLeadFieldsFromWebhook(webhook)

    if (extracted.normalizedPhone || extracted.email) {
      const existingLead = await leadRepository.findByOrganizationAndContact(
        agent.organizationId,
        {
          normalizedPhone: extracted.normalizedPhone,
          email: extracted.email?.trim().toLowerCase(),
        },
      )

      const defaultStage = await findDefaultPipelineStage(agent.organizationId)

      const customFieldsPatch: Record<string, unknown> = {}
      if (extracted.serviceNeeded)
        customFieldsPatch.serviceNeeded = extracted.serviceNeeded
      if (extracted.address)
        customFieldsPatch.customerAddress = extracted.address
      if (extracted.preferredTimeWindow)
        customFieldsPatch.preferredTimeWindow = extracted.preferredTimeWindow

      let lead: Awaited<ReturnType<typeof leadRepository.create>>

      if (existingLead) {
        const updates: Record<string, unknown> = {}
        if (!existingLead.firstName && extracted.firstName)
          updates.firstName = extracted.firstName
        if (!existingLead.lastName && extracted.lastName)
          updates.lastName = extracted.lastName
        if (!existingLead.email && extracted.email)
          updates.email = extracted.email.trim().toLowerCase()
        if (!existingLead.phone && extracted.phone) {
          updates.phone = extracted.phone
          updates.normalizedPhone = extracted.normalizedPhone
        }

        if (Object.keys(customFieldsPatch).length > 0) {
          const prev =
            typeof existingLead.customFields === 'object' &&
            existingLead.customFields !== null
              ? (existingLead.customFields as Record<string, unknown>)
              : {}
          const merged = { ...prev }
          let changed = false
          for (const [k, v] of Object.entries(customFieldsPatch)) {
            if (merged[k] !== v) {
              merged[k] = v
              changed = true
            }
          }
          if (changed) updates.customFields = merged
        }

        if (Object.keys(updates).length > 0) {
          const updated = await leadRepository.update(
            existingLead.id,
            updates as any,
          )
          lead = updated ?? existingLead
          logger.info(
            { leadId: lead.id, fieldsUpdated: Object.keys(updates) },
            'Lead enriched from webhook',
          )
        } else {
          lead = existingLead
          logger.info(
            { leadId: lead.id },
            'Lead already exists, no new fields to update',
          )
        }
      } else {
        lead = await leadRepository.create({
          organizationId: agent.organizationId,
          firstName: extracted.firstName,
          lastName: extracted.lastName,
          email: extracted.email?.trim().toLowerCase() ?? null,
          phone: extracted.phone,
          normalizedPhone: extracted.normalizedPhone,
          company: null,
          title: null,
          linkedInUrl: null,
          website: null,
          customFields:
            Object.keys(customFieldsPatch).length > 0
              ? customFieldsPatch
              : null,
          pipelineStageId: defaultStage?.id ?? null,
          dealValue: null,
          updatedAt: new Date(),
        })
        logger.info(
          { leadId: lead.id, phone: extracted.phone, email: extracted.email },
          'Lead created from webhook with extracted fields',
        )
      }

      // Link lead to call_log (if a matching row exists)
      const callSid =
        (
          webhook.data.metadata?.phone_call as
            | { call_sid?: string }
            | null
            | undefined
        )?.call_sid || webhook.data.conversation_id

      try {
        const linked = await linkLeadToCallLog(
          agent.organizationId,
          callSid,
          lead.id,
        )
        if (linked) {
          logger.info(
            { callLogId: linked.id, leadId: lead.id, callSid },
            'Linked lead to call_log',
          )
        }
      } catch (linkError) {
        logger.warn(
          { error: linkError, callSid },
          'Could not link lead to call_log',
        )
      }

      // Link lead to task_instance
      if (
        taskInstance &&
        (!taskInstance.leadId || taskInstance.leadId === lead.id)
      ) {
        try {
          await updateTaskInstance(taskInstance.id, { leadId: lead.id })
          logger.info(
            { taskInstanceId: taskInstance.id, leadId: lead.id },
            'Linked lead to task_instance',
          )
        } catch (tiError) {
          logger.warn(
            { error: tiError },
            'Could not link lead to task_instance',
          )
        }
      }
    }
  } catch (leadError) {
    logger.warn(
      { error: leadError },
      'Failed to extract/upsert lead from webhook',
    )
  }

  return {
    recording,
    quality: qualityResult,
    organizationId: agent.organizationId,
  }
}
