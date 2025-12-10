import { AuthRequestHandler } from '@/types/handlers'
import {
  GetTaskInstancesRequest,
  GetTaskInstanceRequest,
  UpdateTaskInstanceStatusRequest,
  GetRecordingsRequest,
  PipelineStage,
  LeadType,
  AgentExternalType,
  CallQuality,
} from '@shared/types/src'
import {
  getTaskInstances,
  getTaskInstanceWithDetails,
  updateTaskInstanceStatus,
  updateTaskInstance,
  getRecordings,
  findAgentsByOrganization,
  getLeadsForExport,
} from '@/repositories/organization.repository'
import { createRecording, findTaskInstanceByConversationId } from '@/repositories/agent.repository'
import { ElevenLabsClient } from '@/clients/elevenlabs.client'
import { config } from '@/config'
import logger from '@/lib/logger'

// =============================================================================
// CALL QUALITY CLASSIFICATION
// =============================================================================

const MIN_PRODUCTIVE_DURATION_SECS = 15 // Calls under 15 seconds are likely unproductive
const MIN_CONVERSATION_TURNS = 2 // At least 2 back-and-forth exchanges

interface CallQualityResult {
  quality: CallQuality
  reason: string
}

/**
 * Classifies a call's quality based on duration and transcript content.
 * This helps filter out spam, robocalls, and unproductive calls from metrics.
 */
const classifyCallQuality = (
  durationSecs: number,
  transcriptSummary: string | null,
  transcript: string | null | { role: string; message: string }[],
): CallQualityResult => {
  // 1. Short call check - calls under 15 seconds are almost always unproductive
  if (durationSecs < MIN_PRODUCTIVE_DURATION_SECS) {
    return {
      quality: CallQuality.SHORT_CALL,
      reason: `Call duration (${durationSecs}s) is under ${MIN_PRODUCTIVE_DURATION_SECS}s threshold`,
    }
  }

  // 2. Check for actual conversation content
  const summaryLower = (transcriptSummary || '').toLowerCase()
  
  // Robocall indicators
  const robocallIndicators = [
    'automated',
    'press 1',
    'press one',
    'recording',
    'this is a test',
    'robot',
    'automated message',
    'robo',
  ]
  
  if (robocallIndicators.some(indicator => summaryLower.includes(indicator))) {
    return {
      quality: CallQuality.ROBOCALL,
      reason: 'Automated/robocall indicators detected in transcript',
    }
  }

  // No conversation indicators
  const noConversationIndicators = [
    'no response',
    'caller hung up',
    'disconnected',
    'no conversation',
    'silence',
    'no audio',
    'hang up immediately',
    'ended abruptly',
  ]

  if (noConversationIndicators.some(indicator => summaryLower.includes(indicator))) {
    return {
      quality: CallQuality.NO_CONVERSATION,
      reason: 'No meaningful conversation detected',
    }
  }

  // 3. Check transcript turns if available (array format)
  if (Array.isArray(transcript)) {
    const userTurns = transcript.filter(t => t.role === 'user').length
    const agentTurns = transcript.filter(t => t.role === 'agent' || t.role === 'assistant').length
    
    if (userTurns < MIN_CONVERSATION_TURNS || agentTurns < MIN_CONVERSATION_TURNS) {
      return {
        quality: CallQuality.NO_CONVERSATION,
        reason: `Insufficient conversation turns (user: ${userTurns}, agent: ${agentTurns})`,
      }
    }
  }

  // 4. Check if summary indicates spam
  const spamIndicators = [
    'wrong number',
    'prank',
    'spam',
    'test call',
    'testing',
    'hello hello',
    'anyone there',
  ]

  if (spamIndicators.some(indicator => summaryLower.includes(indicator))) {
    return {
      quality: CallQuality.SPAM,
      reason: 'Spam/prank call indicators detected',
    }
  }

  // 5. Check for meaningful content - productive call indicators
  const productiveIndicators = [
    'scheduled',
    'appointment',
    'booked',
    'service',
    'address',
    'phone number',
    'email',
    'help',
    'problem',
    'issue',
    'request',
    'quote',
    'estimate',
    'inspection',
  ]

  const hasProductiveContent = productiveIndicators.some(indicator => 
    summaryLower.includes(indicator)
  )

  // If duration is reasonable and no negative indicators, consider productive
  if (durationSecs >= 30 || hasProductiveContent) {
    return {
      quality: CallQuality.PRODUCTIVE,
      reason: hasProductiveContent 
        ? 'Meaningful conversation with business intent detected'
        : `Call duration (${durationSecs}s) indicates real conversation`,
    }
  }

  // Default to productive if no negative indicators and duration is 15-30s
  return {
    quality: CallQuality.PRODUCTIVE,
    reason: 'No negative indicators detected, assuming productive call',
  }
}

export const getTaskInstancesHandler: AuthRequestHandler<
  GetTaskInstancesRequest
> = async (req, res) => {
  const {
    organizationId,
    taskId,
    dispatcherId,
    status,
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    startDate,
    endDate,
  } = req.validated

  const result = await getTaskInstances({
    organizationId,
    taskId,
    dispatcherId,
    status,
    search,
    page: page || 1,
    limit: limit || 20,
    sortBy,
    sortOrder,
    startDate,
    endDate,
  })

  res.json(result)
}

export const updateTaskInstanceStatusHandler: AuthRequestHandler<
  UpdateTaskInstanceStatusRequest
> = async (req, res) => {
  const { id, organizationId, status } = req.validated

  const taskInstance = await updateTaskInstanceStatus(
    id,
    organizationId,
    status,
  )

  res.json(taskInstance)
}

export const getTaskInstanceHandler: AuthRequestHandler<
  GetTaskInstanceRequest
> = async (req, res) => {
  const { id, organizationId } = req.validated

  const result = await getTaskInstanceWithDetails(id, organizationId)

  if (!result) {
    return res.status(404).json({ error: 'Task instance not found' })
  }

  res.json(result)
}

export const getRecordingsHandler: AuthRequestHandler<
  GetRecordingsRequest
> = async (req, res) => {
  const { organizationId, page, limit, sortBy, sortOrder, startDate, endDate } = req.validated

  const result = await getRecordings({
    organizationId,
    page: page || 1,
    limit: limit || 20,
    sortBy,
    sortOrder,
    startDate,
    endDate,
  })

  res.json(result)
}

// Update pipeline stage handler
interface UpdatePipelineRequest {
  id: string
  organizationId: string
  pipelineStage: string
}

export const updateTaskInstancePipelineHandler: AuthRequestHandler<
  UpdatePipelineRequest
> = async (req, res) => {
  const { id, pipelineStage } = req.validated

  // Update lead type based on pipeline stage
  let leadType: string | null = null
  let resolutionType: string | null = null
  
  if (pipelineStage === PipelineStage.CLOSED_WON) {
    leadType = LeadType.BOOKING
    resolutionType = 'resolved'
  } else if (pipelineStage === PipelineStage.CLOSED_LOST) {
    leadType = LeadType.NON_BOOKING
    resolutionType = 'unresolved'
  }

  const taskInstance = await updateTaskInstance(id, {
    pipelineStage,
    leadType,
    resolutionType,
  })

  res.json(taskInstance)
}

// Sync recordings from ElevenLabs API
interface SyncRecordingsRequest {
  organizationId: string
}

export const syncRecordingsHandler: AuthRequestHandler<
  SyncRecordingsRequest
> = async (req, res) => {
  const { organizationId } = req.validated

  // Get ElevenLabs API key from config
  const apiKey = config.elevenLabs.apiKey
  if (!apiKey) {
    return res.status(400).json({ error: 'ElevenLabs API key not configured' })
  }

  try {
    const client = new ElevenLabsClient(apiKey)
    
    // Get all agents for this organization
    const agents = await findAgentsByOrganization(organizationId)
    const elevenLabsAgents = agents.filter(a => a.externalType === AgentExternalType.ELEVEN_LABS)
    
    if (elevenLabsAgents.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No ElevenLabs agents found',
        synced: 0 
      })
    }

    let totalSynced = 0
    const errors: string[] = []

    for (const agent of elevenLabsAgents) {
      try {
        logger.info(`📡 Syncing conversations for agent: ${agent.name} (${agent.externalId})`)
        
        // Get recent conversations from ElevenLabs
        const conversations = await client.getNewConversations(agent.externalId)
        
        for (const conv of conversations) {
          // Check if recording already exists
          const existingTaskInstance = await findTaskInstanceByConversationId(
            conv.conversation_id,
            organizationId
          )

          // Use the actual call timestamp from ElevenLabs (convert Unix seconds to Date)
          const callTimestamp = conv.metadata?.start_time_unix_secs 
            ? new Date(conv.metadata.start_time_unix_secs * 1000)
            : new Date()

          // Create recording if we have a task instance but no recording yet
          // Or create orphan recording for conversations not linked to tasks
          try {
            // Classify call quality
            const callDuration = conv.metadata?.call_duration_secs || 0
            const transcriptSummary = conv.analysis?.transcript_summary || null
            const transcript = conv.transcript || null
            
            const qualityResult = classifyCallQuality(
              callDuration,
              transcriptSummary,
              transcript,
            )
            
            logger.info(`📊 Call quality for ${conv.conversation_id}: ${qualityResult.quality} (${qualityResult.reason})`)

            const recording = await createRecording({
              conversationId: conv.conversation_id,
              callSid: conv.metadata?.phone_call?.call_sid || conv.conversation_id,
              taskInstanceId: existingTaskInstance?.id || null,
              organizationId,
              callDurationSeconds: callDuration,
              cost: conv.metadata?.cost || 0,
              transcriptSummary,
              payload: conv as any,
              createdAt: callTimestamp, // Use actual call time
              callQuality: qualityResult.quality,
              callQualityReason: qualityResult.reason,
            })

            logger.info(`✅ Created recording ${recording.id} for conversation ${conv.conversation_id} (quality: ${qualityResult.quality})`)
            totalSynced++
          } catch (error: any) {
            // Likely duplicate - skip
            if (error?.code === '23505' || error?.message?.includes('unique')) {
              logger.info(`⏭️ Recording already exists for ${conv.conversation_id}`)
            } else {
              throw error
            }
          }
        }
      } catch (error: any) {
        logger.error(`Failed to sync agent ${agent.name}:`, error)
        errors.push(`Agent ${agent.name}: ${error.message}`)
      }
    }

    res.json({
      success: true,
      synced: totalSynced,
      agents: elevenLabsAgents.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    logger.error('Failed to sync recordings:', error)
    res.status(500).json({ error: error.message || 'Failed to sync recordings' })
  }
}

// Export leads to CSV
interface ExportLeadsRequest {
  organizationId: string
  startDate?: string
  endDate?: string
  fields?: string // comma-separated list of fields to include
}

// Helper to escape CSV fields
const escapeCSV = (value: string | null | undefined): string => {
  if (value == null) return ''
  const str = String(value)
  // If contains comma, newline, or quote, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Helper to extract customer info from JSON info field
const extractCustomerInfo = (info: Record<string, unknown> | null) => {
  if (!info) return { name: '', phone: '', email: '', address: '' }
  return {
    name: String(info.name || info['customer-name'] || info.Name || info.customerName || ''),
    phone: String(info['phone-number'] || info.phone || info['Phone Number'] || info.phoneNumber || ''),
    email: String(info['email-address'] || info.email || info['Email Address'] || info.emailAddress || ''),
    address: String(info.address || info['customer-address'] || info['location-address'] || info.Address || ''),
  }
}

// Format transcript from recording payload
const formatTranscript = (payload: Record<string, unknown> | null): string => {
  if (!payload) return ''
  
  // Try to get transcript array from payload
  const transcript = payload.transcript as Array<{ role: string; message: string }> | undefined
  if (!transcript || !Array.isArray(transcript)) return ''
  
  // Format transcript as readable text
  return transcript
    .map(entry => `${entry.role === 'agent' ? 'Agent' : 'Customer'}: ${entry.message}`)
    .join(' | ')
}

// Helper to format date in a friendly format without commas: "Dec 9 2025 7:00 AM"
const formatFriendlyDate = (date: Date | string | null): string => {
  if (!date) return ''
  const d = new Date(date)
  const month = d.toLocaleString('en-US', { month: 'short' })
  const day = d.getDate()
  const year = d.getFullYear()
  const time = d.toLocaleString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  })
  return `${month} ${day} ${year} ${time}`
}

// Helper to format call duration in minutes:seconds
const formatDuration = (seconds: number | null): string => {
  if (!seconds) return ''
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// All available export fields - ALL values go through escapeCSV for safety
const EXPORT_FIELDS = {
  name: { header: 'Name', getValue: (lead: any, customer: any) => escapeCSV(customer.name) },
  phone: { header: 'Phone', getValue: (lead: any, customer: any) => escapeCSV(customer.phone) },
  email: { header: 'Email', getValue: (lead: any, customer: any) => escapeCSV(customer.email) },
  address: { header: 'Address', getValue: (lead: any, customer: any) => escapeCSV(customer.address) },
  pipelineStage: { header: 'Pipeline Stage', getValue: (lead: any) => escapeCSV(lead.pipelineStage?.replace(/_/g, ' ')) },
  estimatedValue: { header: 'Estimated Value', getValue: (lead: any) => lead.estimatedValue ? `$${lead.estimatedValue}` : '' },
  leadScore: { header: 'Lead Score', getValue: (lead: any) => lead.leadScore ? String(lead.leadScore) : '' },
  appointmentTime: { header: 'Appointment Time', getValue: (lead: any) => escapeCSV(formatFriendlyDate(lead.appointmentTime)) },
  callDate: { header: 'Call Date', getValue: (lead: any) => escapeCSV(formatFriendlyDate(lead.createdAt)) },
  callDuration: { header: 'Call Duration', getValue: (lead: any) => formatDuration(lead.recordingDuration) },
  transcriptSummary: { header: 'Transcript Summary', getValue: (lead: any) => escapeCSV(lead.transcriptSummary?.replace(/\n/g, ' ').replace(/\r/g, '')) },
}

const DEFAULT_FIELDS = Object.keys(EXPORT_FIELDS)

export const exportLeadsHandler: AuthRequestHandler<
  ExportLeadsRequest
> = async (req, res) => {
  const { organizationId, startDate, endDate, fields } = req.validated

  try {
    // Get all leads with recordings, optionally filtered by date
    const leads = await getLeadsForExport(organizationId, startDate, endDate)

    // Determine which fields to include
    const selectedFields = fields 
      ? fields.split(',').filter(f => f in EXPORT_FIELDS)
      : DEFAULT_FIELDS

    // Build CSV headers from selected fields
    const headers = selectedFields.map(f => EXPORT_FIELDS[f as keyof typeof EXPORT_FIELDS].header)

    // Build CSV rows
    const rows = leads.map(lead => {
      const customer = extractCustomerInfo(lead.info as Record<string, unknown> | null)
      
      return selectedFields.map(field => {
        const fieldConfig = EXPORT_FIELDS[field as keyof typeof EXPORT_FIELDS]
        return fieldConfig.getValue(lead, customer)
      }).join(',')
    })

    // Combine headers and rows
    const csv = [headers.join(','), ...rows].join('\n')

    // Send CSV response with date range in filename if provided
    let filename = 'leads-export'
    if (startDate && endDate) {
      filename += `-${startDate.split('T')[0]}-to-${endDate.split('T')[0]}`
    } else {
      filename += `-${new Date().toISOString().split('T')[0]}`
    }
    filename += '.csv'
    
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(csv)
    
  } catch (error: any) {
    logger.error('Failed to export leads:', error)
    res.status(500).json({ error: error.message || 'Failed to export leads' })
  }
}

// =============================================================================
// UPDATE RECORDING QUALITY (Manual Override)
// =============================================================================

interface UpdateRecordingQualityRequest {
  organizationId: string
  recordingId: string
  callQuality: string
}

export const updateRecordingQualityHandler: AuthRequestHandler<
  UpdateRecordingQualityRequest
> = async (req, res) => {
  const { organizationId, recordingId, callQuality } = req.validated

  try {
    const { updateRecordingQuality } = await import('@/repositories/organization.repository')
    
    const recording = await updateRecordingQuality(recordingId, organizationId, {
      callQuality,
      callQualityReason: 'Manually updated by user',
    })

    res.json({ success: true, recording })
  } catch (error: any) {
    logger.error('Failed to update recording quality:', error)
    res.status(500).json({ error: error.message || 'Failed to update recording quality' })
  }
}
