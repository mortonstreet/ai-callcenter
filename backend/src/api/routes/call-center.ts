import { Router } from 'express'
import { z } from 'zod'
import { withBetterAuth, validateIsAdmin } from '../middlewares/auth'
import { validateAndMerge } from '../middlewares/validationMiddleware'
import { twilioClient } from '@/clients/twilio.client'
import { config } from '@/config'
import logger from '@/lib/logger'
import type { Request, Response } from 'express'
import Twilio from 'twilio'
import {
  findTwilioConfig,
  findTwilioConfigByPhoneNumber,
  upsertTwilioConfig,
  findDispositions,
  createDisposition,
  updateDisposition,
  deleteDisposition,
  createDefaultDispositions,
  findCallLogs,
  createCallLog,
  updateCallLogByCallSid,
} from '@/repositories/call-center.repository'
import { findMembersByOrganizationId } from '@/repositories/organization.repository'

const { twiml: TwiML } = Twilio

const router = Router()

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Load Twilio credentials from DB for the user's active organization
 * and set them on the twilioClient singleton.
 */
async function loadTwilioCredentials(req: Request): Promise<boolean> {
  const session = (req as any).session
  const orgId = session?.session?.activeOrganizationId
  if (!orgId) return false

  const dbConfig = await findTwilioConfig(orgId)
  if (dbConfig?.accountSid && dbConfig?.authToken && dbConfig?.phoneNumber) {
    twilioClient.setCredentials({
      accountSid: dbConfig.accountSid,
      authToken: dbConfig.authToken,
      phoneNumber: dbConfig.phoneNumber,
      apiKeySid: dbConfig.apiKeySid || undefined,
      apiKeySecret: dbConfig.apiKeySecret || undefined,
      twimlAppSid: dbConfig.twimlAppSid || undefined,
    })
    return true
  }

  // Fall back to env vars (twilioClient checks these by default)
  twilioClient.clearCredentials()
  return twilioClient.isConfigured()
}

function getOrgId(req: Request): string | null {
  const session = (req as any).session
  return session?.session?.activeOrganizationId || null
}

// =============================================================================
// SCHEMAS
// =============================================================================

const MakeCallSchema = z.object({
  to: z.string().min(10, 'Phone number is required'),
  fromNumberId: z.string().optional(),
})

const EndCallSchema = z.object({
  callSid: z.string(),
})

const CallOutcomeSchema = z.object({
  callSid: z.string(),
  outcome: z.enum([
    'booked',
    'follow_up',
    'not_interested',
    'no_answer',
    'voicemail',
    'wrong_number',
  ]),
  notes: z.string().optional(),
})

const SaveConfigSchema = z.object({
  accountSid: z.string().optional(),
  authToken: z.string().optional(),
  phoneNumber: z.string().optional(),
  apiKeySid: z.string().optional(),
  apiKeySecret: z.string().optional(),
  twimlAppSid: z.string().optional(),
  autoRecord: z.boolean().optional(),
})

const CreateDispositionSchema = z.object({
  label: z.string().min(1),
  color: z.string().optional(),
  sortOrder: z.number().optional(),
})

const UpdateDispositionSchema = z.object({
  label: z.string().min(1).optional(),
  color: z.string().optional(),
  sortOrder: z.number().optional(),
})

// =============================================================================
// CONFIGURATION ENDPOINTS
// =============================================================================

/**
 * GET /call-center/config
 * Get current Twilio configuration for the organization
 */
router.get(
  '/config',
  withBetterAuth,
  validateIsAdmin,
  async (req: Request, res: Response) => {
    const orgId = getOrgId(req)
    if (!orgId) {
      return res.status(400).json({ error: 'No active organization' })
    }

    const dbConfig = await findTwilioConfig(orgId)

    res.json({
      accountSid: dbConfig?.accountSid
        ? `${dbConfig.accountSid.slice(0, 8)}...${dbConfig.accountSid.slice(-4)}`
        : null,
      phoneNumber: dbConfig?.phoneNumber || null,
      autoRecord: dbConfig?.autoRecord ?? true,
      configured: !!(
        dbConfig?.accountSid &&
        dbConfig?.authToken &&
        dbConfig?.phoneNumber
      ),
      voiceConfigured: !!(
        dbConfig?.accountSid &&
        dbConfig?.apiKeySid &&
        dbConfig?.apiKeySecret &&
        dbConfig?.twimlAppSid
      ),
    })
  },
)

/**
 * POST /call-center/config
 * Save Twilio configuration for the organization
 */
router.post(
  '/config',
  withBetterAuth,
  validateIsAdmin,
  validateAndMerge(SaveConfigSchema),
  async (req: Request, res: Response) => {
    const orgId = getOrgId(req)
    if (!orgId) {
      return res.status(400).json({ error: 'No active organization' })
    }

    const data = (req as any).validated

    try {
      const result = await upsertTwilioConfig(orgId, data)

      // Clear cached client so next request uses new creds
      twilioClient.clearCredentials()

      // If this is a new config, create default dispositions
      const dispositions = await findDispositions(orgId)
      if (dispositions.length === 0) {
        await createDefaultDispositions(orgId)
      }

      // Auto-configure phone number voice URL if backendUrl is public
      if (
        config.backendUrl &&
        !config.backendUrl.includes('localhost') &&
        result.phoneNumber &&
        result.accountSid &&
        result.authToken
      ) {
        try {
          twilioClient.setCredentials({
            accountSid: result.accountSid,
            authToken: result.authToken,
            phoneNumber: result.phoneNumber,
            apiKeySid: result.apiKeySid || undefined,
            apiKeySecret: result.apiKeySecret || undefined,
            twimlAppSid: result.twimlAppSid || undefined,
          })

          const voiceUrl = `${config.backendUrl}/api/call-center/voice`

          // 1. Set the TwiML App's voice URL to our webhook
          if (result.twimlAppSid) {
            await twilioClient.updateTwimlAppVoiceUrl(
              result.twimlAppSid,
              voiceUrl,
            )
          }

          // 2. Configure phone number to route through TwiML App (if available)
          //    or fall back to direct voiceUrl
          await twilioClient.updatePhoneNumberVoiceConfig(
            result.phoneNumber,
            voiceUrl,
            `${config.backendUrl}/api/call-center/webhook`,
            result.twimlAppSid || undefined,
          )

          twilioClient.clearCredentials()
        } catch (err: any) {
          logger.error('Failed to auto-configure voice URL:', err)
          twilioClient.clearCredentials()
        }
      }

      logger.info(`Twilio config saved for org ${orgId}`)

      res.json({
        success: true,
        configured: !!(
          result.accountSid &&
          result.authToken &&
          result.phoneNumber
        ),
      })
    } catch (error: any) {
      logger.error('Failed to save Twilio config:', error)
      res.status(500).json({ error: error.message })
    }
  },
)

// =============================================================================
// STATUS & AUTH
// =============================================================================

/**
 * GET /call-center/status
 * Check if Twilio is configured and ready
 */
router.get(
  '/status',
  withBetterAuth,
  validateIsAdmin,
  async (req: Request, res: Response) => {
    await loadTwilioCredentials(req)

    const isConfigured = twilioClient.isConfigured()
    const isVoiceConfigured = twilioClient.isVoiceConfigured()

    res.json({
      configured: isConfigured,
      voiceConfigured: isVoiceConfigured,
      phoneNumber: isConfigured ? twilioClient.getPhoneNumber() : null,
    })
  },
)

/**
 * GET /call-center/token
 * Get access token for browser-based calling
 */
router.get(
  '/token',
  withBetterAuth,
  validateIsAdmin,
  async (req: Request, res: Response) => {
    try {
      await loadTwilioCredentials(req)

      if (!twilioClient.isVoiceConfigured()) {
        return res.status(400).json({
          error:
            'Voice calling not configured. Need TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, and TWILIO_TWIML_APP_SID.',
        })
      }

      const user = (req as any).user
      const identity = `agent_${user.id}`

      logger.info(
        `Generating voice token for identity: ${identity} (user: ${user.email || user.name})`,
      )

      const token = twilioClient.generateAccessToken(identity)

      res.json({ token, identity })
    } catch (error: any) {
      logger.error('Failed to generate access token:', error)
      res.status(500).json({ error: error.message })
    }
  },
)

/**
 * GET /call-center/phone-numbers
 * List available Twilio phone numbers
 */
router.get(
  '/phone-numbers',
  withBetterAuth,
  validateIsAdmin,
  async (req: Request, res: Response) => {
    await loadTwilioCredentials(req)

    if (!twilioClient.isConfigured()) {
      return res.status(400).json({ error: 'Twilio not configured' })
    }

    const result = await twilioClient.listPhoneNumbers()

    if (result.success && result.numbers) {
      return res.json({ numbers: result.numbers })
    }

    // Fallback to configured number
    const phoneNumber = twilioClient.getPhoneNumber()
    res.json({
      numbers: phoneNumber
        ? [{ sid: 'default', phoneNumber, friendlyName: 'Primary Line' }]
        : [],
    })
  },
)

// =============================================================================
// CALL MANAGEMENT
// =============================================================================

/**
 * POST /call-center/call
 * Initiate an outbound call
 */
router.post(
  '/call',
  withBetterAuth,
  validateIsAdmin,
  validateAndMerge(MakeCallSchema),
  async (req: Request, res: Response) => {
    const { to } = (req as any).validated
    const orgId = getOrgId(req)
    const userId = (req as any).user?.id

    await loadTwilioCredentials(req)

    if (!twilioClient.isConfigured()) {
      return res.status(400).json({ error: 'Twilio not configured' })
    }

    const statusCallbackUrl = `${config.backendUrl}/api/call-center/webhook`

    logger.info(`Admin initiating call to ${to}`)

    const result = await twilioClient.makeCall(to, statusCallbackUrl)

    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }

    // Log the call in the database
    if (orgId) {
      try {
        await createCallLog({
          organizationId: orgId,
          userId: userId || undefined,
          callSid: result.callSid,
          direction: 'outbound',
          fromNumber: twilioClient.getPhoneNumber() || '',
          toNumber: to,
          status: result.status || 'initiated',
        })
      } catch (err: any) {
        logger.error('Failed to log call:', err)
      }
    }

    res.json({
      success: true,
      callSid: result.callSid,
      status: result.status,
    })
  },
)

/**
 * POST /call-center/call/end
 * End an active call
 */
router.post(
  '/call/end',
  withBetterAuth,
  validateIsAdmin,
  validateAndMerge(EndCallSchema),
  async (req: Request, res: Response) => {
    const { callSid } = (req as any).validated

    await loadTwilioCredentials(req)

    const result = await twilioClient.endCall(callSid)

    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }

    // Update call log
    try {
      await updateCallLogByCallSid(callSid, {
        status: 'completed',
        endedAt: new Date(),
      })
    } catch (err: any) {
      logger.error('Failed to update call log:', err)
    }

    res.json({
      success: true,
      callSid: result.callSid,
      status: result.status,
    })
  },
)

/**
 * GET /call-center/call/:callSid
 * Get call details
 */
router.get(
  '/call/:callSid',
  withBetterAuth,
  validateIsAdmin,
  async (req: Request, res: Response) => {
    const { callSid } = req.params

    await loadTwilioCredentials(req)

    const result = await twilioClient.getCall(callSid)

    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }

    res.json(result.call)
  },
)

/**
 * GET /call-center/call/:callSid/recordings
 * Get recordings for a call
 */
router.get(
  '/call/:callSid/recordings',
  withBetterAuth,
  validateIsAdmin,
  async (req: Request, res: Response) => {
    const { callSid } = req.params

    await loadTwilioCredentials(req)

    const result = await twilioClient.getRecordings(callSid)

    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }

    res.json({ recordings: result.recordings })
  },
)

/**
 * POST /call-center/call/outcome
 * Set the outcome of a call
 */
router.post(
  '/call/outcome',
  withBetterAuth,
  validateIsAdmin,
  validateAndMerge(CallOutcomeSchema),
  async (req: Request, res: Response) => {
    const { callSid, outcome, notes } = (req as any).validated

    logger.info(
      `Call ${callSid} outcome: ${outcome}${notes ? ` - ${notes}` : ''}`,
    )

    try {
      await updateCallLogByCallSid(callSid, { outcome, notes })
    } catch (err: any) {
      logger.error('Failed to update call outcome:', err)
    }

    res.json({
      success: true,
      callSid,
      outcome,
    })
  },
)

// =============================================================================
// CALL HISTORY
// =============================================================================

/**
 * GET /call-center/calls
 * List call history with optional filtering
 */
router.get(
  '/calls',
  withBetterAuth,
  validateIsAdmin,
  async (req: Request, res: Response) => {
    const orgId = getOrgId(req)
    if (!orgId) {
      return res.status(400).json({ error: 'No active organization' })
    }

    const direction = req.query.direction as string | undefined
    const limit = req.query.limit
      ? parseInt(req.query.limit as string)
      : undefined
    const page = req.query.page ? parseInt(req.query.page as string) : undefined

    try {
      const result = await findCallLogs(orgId, { direction, limit, page })

      // Map to frontend-expected format
      const data = result.data.map((call) => ({
        id: call.id,
        callSid: call.callSid,
        direction: call.direction,
        fromNumber: call.fromNumber,
        toNumber: call.toNumber,
        status: call.status,
        duration: call.duration,
        startedAt: call.startedAt,
        endedAt: call.endedAt,
        recordingUrl: call.recordingUrl,
        outcome: call.outcome,
        leadId: call.leadId,
        leadFirstName: null,
        leadLastName: null,
        leadCompany: null,
        userName: null,
      }))

      res.json({ data, total: result.total })
    } catch (error: any) {
      logger.error('Failed to list calls:', error)
      res.status(500).json({ error: error.message })
    }
  },
)

// =============================================================================
// ANALYTICS
// =============================================================================

/**
 * GET /call-center/analytics
 * Get call analytics (metrics, charts, disposition breakdown)
 */
router.get(
  '/analytics',
  withBetterAuth,
  async (req: Request, res: Response) => {
    const orgId = getOrgId(req)
    if (!orgId) {
      return res.status(400).json({ error: 'No active organization' })
    }

    const startDate = req.query.startDate as string | undefined
    const endDate = req.query.endDate as string | undefined

    try {
      const { db } = await import('@/lib/db')
      const { sql } = await import('kysely')

      let query = db.selectFrom('call_log').where('organizationId', '=', orgId)

      if (startDate) {
        query = query.where('startedAt', '>=', new Date(startDate))
      }
      if (endDate) {
        query = query.where('startedAt', '<=', new Date(endDate))
      }

      const calls = await query.selectAll().execute()

      // Metrics
      const totalCalls = calls.length
      const outboundCalls = calls.filter(
        (c) => c.direction === 'outbound',
      ).length
      const inboundCalls = calls.filter((c) => c.direction === 'inbound').length
      const connectedCalls = calls.filter(
        (c) =>
          c.status === 'completed' ||
          c.status === 'in-progress' ||
          (c.duration && c.duration > 0),
      ).length
      const connectionRate =
        totalCalls > 0 ? Math.round((connectedCalls / totalCalls) * 100) : 0
      const totalTalkTimeSeconds = calls.reduce(
        (sum, c) => sum + (c.duration || 0),
        0,
      )
      const avgCallDurationSeconds =
        connectedCalls > 0
          ? Math.round(totalTalkTimeSeconds / connectedCalls)
          : 0

      // Disposition breakdown
      const dispositions = await findDispositions(orgId)
      const dispositionMap = new Map(dispositions.map((d) => [d.id, d]))

      const dispositionCounts: Record<string, number> = {}
      let noDispositionCount = 0
      for (const call of calls) {
        if (call.dispositionId) {
          dispositionCounts[call.dispositionId] =
            (dispositionCounts[call.dispositionId] || 0) + 1
        } else if (call.outcome) {
          // Use outcome as fallback label
          const key = `outcome:${call.outcome}`
          dispositionCounts[key] = (dispositionCounts[key] || 0) + 1
        } else {
          noDispositionCount++
        }
      }

      const outcomeColors: Record<string, string> = {
        booked: '#22c55e',
        follow_up: '#3b82f6',
        not_interested: '#6b7280',
        no_answer: '#eab308',
        voicemail: '#8b5cf6',
        wrong_number: '#ef4444',
      }

      const dispositionBreakdown = [
        ...Object.entries(dispositionCounts).map(([id, count]) => {
          if (id.startsWith('outcome:')) {
            const outcome = id.replace('outcome:', '')
            return {
              dispositionId: null,
              label: outcome
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase()),
              color: outcomeColors[outcome] || '#6B7280',
              count,
            }
          }
          const disp = dispositionMap.get(id)
          return {
            dispositionId: id,
            label: disp?.label || 'Unknown',
            color: disp?.color || '#6B7280',
            count,
          }
        }),
        ...(noDispositionCount > 0
          ? [
              {
                dispositionId: null,
                label: 'No Status',
                color: '#22c55e',
                count: noDispositionCount,
              },
            ]
          : []),
      ].sort((a, b) => b.count - a.count)

      // Calls over time
      const callsByDate: Record<string, { outbound: number; inbound: number }> =
        {}
      for (const call of calls) {
        const date = new Date(call.startedAt).toISOString().split('T')[0]
        if (!callsByDate[date]) callsByDate[date] = { outbound: 0, inbound: 0 }
        if (call.direction === 'outbound') callsByDate[date].outbound++
        else callsByDate[date].inbound++
      }

      // Fill in missing dates
      if (startDate && endDate) {
        const start = new Date(startDate)
        const end = new Date(endDate)
        const current = new Date(start)
        while (current <= end) {
          const dateStr = current.toISOString().split('T')[0]
          if (!callsByDate[dateStr])
            callsByDate[dateStr] = { outbound: 0, inbound: 0 }
          current.setDate(current.getDate() + 1)
        }
      }

      const callsOverTime = Object.entries(callsByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, counts]) => ({
          date,
          outbound: counts.outbound,
          inbound: counts.inbound,
        }))

      res.json({
        data: {
          metrics: {
            totalCalls,
            outboundCalls,
            inboundCalls,
            connectedCalls,
            connectionRate,
            totalTalkTimeSeconds,
            avgCallDurationSeconds,
          },
          dispositionBreakdown,
          callsOverTime,
        },
      })
    } catch (error: any) {
      logger.error('Failed to get analytics:', error)
      res.status(500).json({ error: error.message })
    }
  },
)

/**
 * GET /call-center/activity
 * Get activity feed
 */
router.get('/activity', withBetterAuth, async (req: Request, res: Response) => {
  const orgId = getOrgId(req)
  if (!orgId) {
    return res.status(400).json({ error: 'No active organization' })
  }

  const type = (req.query.type as string) || 'all'
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 20

  try {
    const { db } = await import('@/lib/db')

    // Get recent calls as activity items
    let query = db
      .selectFrom('call_log')
      .where('organizationId', '=', orgId)
      .orderBy('startedAt', 'desc')
      .limit(limit)

    if (type === 'calls') {
      // Already filtering call_log
    }

    const calls = await query.selectAll().execute()

    const items = calls.map((call) => ({
      id: call.id,
      type: 'call' as const,
      userId: call.userId || '',
      userName: '',
      description: `Call ${call.direction} - ${Math.floor((call.duration || 0) / 60)}:${String((call.duration || 0) % 60).padStart(2, '0')} duration`,
      metadata: {
        callDuration: call.duration || 0,
        disposition: call.outcome || undefined,
      },
      createdAt: call.startedAt.toISOString
        ? call.startedAt.toISOString()
        : new Date(call.startedAt).toISOString(),
    }))

    res.json({ items })
  } catch (error: any) {
    logger.error('Failed to get activity:', error)
    res.status(500).json({ error: error.message })
  }
})

// =============================================================================
// DISPOSITIONS
// =============================================================================

/**
 * GET /call-center/dispositions
 * List all dispositions for the organization
 */
router.get(
  '/dispositions',
  withBetterAuth,
  validateIsAdmin,
  async (req: Request, res: Response) => {
    const orgId = getOrgId(req)
    if (!orgId) {
      return res.status(400).json({ error: 'No active organization' })
    }

    try {
      const dispositions = await findDispositions(orgId)

      // If no dispositions exist yet, create defaults
      if (dispositions.length === 0) {
        await createDefaultDispositions(orgId)
        const created = await findDispositions(orgId)
        return res.json({ data: created })
      }

      res.json({ data: dispositions })
    } catch (error: any) {
      logger.error('Failed to list dispositions:', error)
      res.status(500).json({ error: error.message })
    }
  },
)

/**
 * POST /call-center/dispositions
 * Create a new disposition
 */
router.post(
  '/dispositions',
  withBetterAuth,
  validateIsAdmin,
  validateAndMerge(CreateDispositionSchema),
  async (req: Request, res: Response) => {
    const orgId = getOrgId(req)
    if (!orgId) {
      return res.status(400).json({ error: 'No active organization' })
    }

    const { label, color, sortOrder } = (req as any).validated

    try {
      const disposition = await createDisposition({
        organizationId: orgId,
        label,
        color,
        sortOrder,
      })
      res.json(disposition)
    } catch (error: any) {
      logger.error('Failed to create disposition:', error)
      res.status(500).json({ error: error.message })
    }
  },
)

/**
 * PATCH /call-center/dispositions/:id
 * Update a disposition
 */
router.patch(
  '/dispositions/:id',
  withBetterAuth,
  validateIsAdmin,
  validateAndMerge(UpdateDispositionSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params
    const data = (req as any).validated

    try {
      const updated = await updateDisposition(id, data)
      res.json(updated)
    } catch (error: any) {
      logger.error('Failed to update disposition:', error)
      res.status(500).json({ error: error.message })
    }
  },
)

/**
 * DELETE /call-center/dispositions/:id
 * Delete a disposition
 */
router.delete(
  '/dispositions/:id',
  withBetterAuth,
  validateIsAdmin,
  async (req: Request, res: Response) => {
    const { id } = req.params

    try {
      await deleteDisposition(id)
      res.json({ success: true })
    } catch (error: any) {
      logger.error('Failed to delete disposition:', error)
      res.status(500).json({ error: error.message })
    }
  },
)

/**
 * GET /call-center/debug-voice-config
 * Check what voice URL is actually configured on the Twilio phone number & TwiML App
 */
router.get(
  '/debug-voice-config',
  withBetterAuth,
  validateIsAdmin,
  async (req: Request, res: Response) => {
    await loadTwilioCredentials(req)

    if (!twilioClient.isConfigured()) {
      return res.status(400).json({ error: 'Twilio not configured' })
    }

    try {
      const orgId = getOrgId(req)
      const dbConfig = orgId ? await findTwilioConfig(orgId) : null

      const numbers = await twilioClient.listPhoneNumbers()
      const phoneDetails: any[] = []

      if (numbers.success && numbers.numbers) {
        const client = twilioClient.getClient()
        for (const num of numbers.numbers) {
          try {
            const full = await client.incomingPhoneNumbers(num.sid).fetch()
            phoneDetails.push({
              sid: full.sid,
              phoneNumber: full.phoneNumber,
              voiceUrl: full.voiceUrl,
              voiceMethod: full.voiceMethod,
              voiceApplicationSid: full.voiceApplicationSid,
              statusCallback: full.statusCallback,
            })
          } catch (e: any) {
            phoneDetails.push({ sid: num.sid, error: e.message })
          }
        }
      }

      let twimlAppDetails = null
      if (dbConfig?.twimlAppSid) {
        try {
          const client = twilioClient.getClient()
          const app = await client.applications(dbConfig.twimlAppSid).fetch()
          twimlAppDetails = {
            sid: app.sid,
            friendlyName: app.friendlyName,
            voiceUrl: app.voiceUrl,
            voiceMethod: app.voiceMethod,
          }
        } catch (e: any) {
          twimlAppDetails = { error: e.message }
        }
      }

      res.json({
        backendUrl: config.backendUrl,
        expectedVoiceUrl: `${config.backendUrl}/api/call-center/voice`,
        phoneNumbers: phoneDetails,
        twimlApp: twimlAppDetails,
        dbPhoneNumber: dbConfig?.phoneNumber,
        dbTwimlAppSid: dbConfig?.twimlAppSid,
      })
    } catch (error: any) {
      logger.error('Debug voice config error:', error)
      res.status(500).json({ error: error.message })
    }
  },
)

// =============================================================================
// WEBHOOKS (from Twilio)
// =============================================================================

/**
 * POST /call-center/voice
 * TwiML App voice webhook - handles both outbound (browser SDK) and inbound (external caller) calls.
 *
 * Outbound: Browser SDK sends CallerId param, From is "client:agent_xxx", To is the PSTN number.
 * Inbound: External caller dials the Twilio number. To is the Twilio number, From is the caller's number.
 *          No CallerId param is sent by the browser.
 */
router.post('/voice', async (req: Request, res: Response) => {
  const {
    To,
    From,
    Caller,
    CallSid,
    CallerId: callerIdParam,
    Direction,
    Called,
  } = req.body || {}

  logger.info(
    `Voice webhook - To: ${To}, From: ${From}, Caller: ${Caller}, CallerId: ${callerIdParam}, CallSid: ${CallSid}, Direction: ${Direction}, Called: ${Called}`,
  )
  logger.info(`Voice webhook full body: ${JSON.stringify(req.body)}`)

  const voiceResponse = new TwiML.VoiceResponse()

  // Detect outbound vs inbound:
  // Outbound: browser SDK call — From starts with "client:" (e.g. "client:agent_xxx")
  // Inbound: external PSTN caller — From is a phone number, To is the Twilio number
  const isOutbound = !!(callerIdParam || (From && From.startsWith('client:')))

  if (isOutbound) {
    // ── OUTBOUND: Browser agent dialing a PSTN number ──
    if (To) {
      // Resolve callerId: explicit param > org's DB phone number > env fallback
      let callerId =
        callerIdParam || (From && !From.startsWith('client:') ? From : null)

      // If still no callerId, look up the org's configured phone number from DB
      if (!callerId) {
        try {
          // Extract user ID from the client identity (From = "client:agent_<userId>")
          const clientIdentity = From?.replace('client:', '') || ''
          const userIdMatch = clientIdentity.replace('agent_', '')
          if (userIdMatch) {
            const { db } = await import('@/lib/db')
            // Find the member's org, then get the Twilio config phone number
            const member = await db
              .selectFrom('member')
              .where('userId', '=', userIdMatch)
              .select(['organizationId'])
              .executeTakeFirst()
            if (member) {
              const orgConfig = await findTwilioConfig(member.organizationId)
              if (orgConfig?.phoneNumber) {
                // Normalize to E.164
                const digits = orgConfig.phoneNumber.replace(/\D/g, '')
                callerId =
                  digits.length === 10
                    ? `+1${digits}`
                    : digits.length === 11
                      ? `+${digits}`
                      : orgConfig.phoneNumber
              }
            }
          }
        } catch (err: any) {
          logger.error('Failed to resolve callerId from DB:', err)
        }
      }

      // Final fallback to env var
      if (!callerId) {
        callerId = config.twilio.phoneNumber || undefined
      }

      if (!callerId) {
        logger.error('No valid callerId available for outbound call')
        voiceResponse.say('Call cannot be completed. No caller ID configured.')
        res.type('text/xml')
        return res.send(voiceResponse.toString())
      }

      let destination = To
      if (!To.startsWith('client:') && !To.startsWith('+')) {
        destination = `+1${To}`
      }

      logger.info(
        `Outbound call: callerId=${callerId}, destination=${destination}`,
      )

      const dialOpts: Record<string, any> = {
        callerId,
        record: 'record-from-answer-dual',
      }

      // Only set recording callback if backendUrl is a valid public URL
      if (config.backendUrl && !config.backendUrl.includes('localhost')) {
        dialOpts.recordingStatusCallback = `${config.backendUrl}/api/call-center/webhook/recording`
        dialOpts.recordingStatusCallbackEvent = ['completed']
      }

      const dial = voiceResponse.dial(dialOpts)

      if (destination.startsWith('client:')) {
        dial.client(destination.replace('client:', ''))
      } else {
        dial.number(destination)
      }
    } else {
      voiceResponse.say('No destination specified.')
    }
  } else {
    // ── INBOUND: External caller dialing the Twilio number ──
    logger.info(
      `Inbound call detected - From: ${From}, To: ${To}, CallSid: ${CallSid}`,
    )

    try {
      // Look up which org owns this Twilio number
      const twilioConfig = await findTwilioConfigByPhoneNumber(To || '')

      logger.info(
        `Inbound lookup result for ${To}: ${twilioConfig ? `found org ${twilioConfig.organizationId}` : 'NOT FOUND'}`,
      )

      if (!twilioConfig) {
        logger.warn(
          `No org found for Twilio number ${To} — check that twilio_config.phoneNumber matches`,
        )
        voiceResponse.say('Sorry, this number is not configured. Goodbye.')
        voiceResponse.hangup()
        res.type('text/xml')
        return res.send(voiceResponse.toString())
      }

      // Get all org members to ring as browser clients
      const members = await findMembersByOrganizationId(
        twilioConfig.organizationId,
      )
      logger.info(
        `Found ${members.length} members for org ${twilioConfig.organizationId}: ${members.map((m) => `agent_${m.userId}`).join(', ')}`,
      )

      if (members.length === 0) {
        logger.warn(`No members found for org ${twilioConfig.organizationId}`)
        voiceResponse.say(
          'Sorry, no agents are available right now. Please try again later.',
        )
        voiceResponse.hangup()
        res.type('text/xml')
        return res.send(voiceResponse.toString())
      }

      // Create call log for the inbound call
      try {
        await createCallLog({
          organizationId: twilioConfig.organizationId,
          callSid: CallSid || undefined,
          direction: 'inbound',
          fromNumber: From || '',
          toNumber: To || '',
          status: 'ringing',
        })
      } catch (err: any) {
        logger.error('Failed to log inbound call:', err)
      }

      // Ring all org members as browser clients simultaneously
      const inboundDialOpts: Record<string, any> = {
        callerId: From,
        record: 'record-from-answer-dual',
        timeout: 30,
      }

      // Only set callback URLs if backendUrl is a valid public URL
      if (config.backendUrl && !config.backendUrl.includes('localhost')) {
        inboundDialOpts.action = `${config.backendUrl}/api/call-center/voice/inbound/status`
        inboundDialOpts.recordingStatusCallback = `${config.backendUrl}/api/call-center/webhook/recording`
        inboundDialOpts.recordingStatusCallbackEvent = ['completed']
      }

      const dial = voiceResponse.dial(inboundDialOpts)

      for (const member of members) {
        dial.client(`agent_${member.userId}`)
      }

      logger.info(
        `Ringing ${members.length} agents for inbound call ${CallSid}`,
      )
    } catch (err: any) {
      logger.error('Error handling inbound call:', err)
      voiceResponse.say('An error occurred. Please try again later.')
      voiceResponse.hangup()
    }
  }

  const twimlResponse = voiceResponse.toString()
  logger.info(`Voice webhook returning TwiML: ${twimlResponse}`)
  res.type('text/xml')
  res.send(twimlResponse)
})

/**
 * POST /call-center/voice/inbound/status
 * Called when an inbound dial completes (action URL). Handles missed calls / voicemail.
 */
router.post('/voice/inbound/status', async (req: Request, res: Response) => {
  const { CallSid, DialCallStatus, DialCallDuration } = req.body || {}

  logger.info(
    `Inbound dial status: ${CallSid} - ${DialCallStatus} (${DialCallDuration || 0}s)`,
  )

  const voiceResponse = new TwiML.VoiceResponse()

  // If nobody answered, leave a voicemail message
  if (DialCallStatus !== 'completed' && DialCallStatus !== 'answered') {
    voiceResponse.say(
      'All agents are currently unavailable. Please leave a message after the beep.',
    )
    voiceResponse.record({
      maxLength: 120,
      action: `${config.backendUrl}/api/call-center/voice/recording-complete`,
      transcribe: false,
      recordingStatusCallback: `${config.backendUrl}/api/call-center/webhook/recording`,
      recordingStatusCallbackEvent: ['completed'],
    })
    voiceResponse.say('We did not receive a recording. Goodbye.')
    voiceResponse.hangup()

    // Update call log as missed/voicemail
    if (CallSid) {
      try {
        await updateCallLogByCallSid(CallSid, {
          status: 'no-answer',
          outcome: 'voicemail',
        })
      } catch (err: any) {
        logger.error('Failed to update inbound call as missed:', err)
      }
    }
  } else {
    // Call was answered - update status
    if (CallSid) {
      try {
        const updateData: Record<string, any> = { status: 'completed' }
        if (DialCallDuration) updateData.duration = parseInt(DialCallDuration)
        updateData.endedAt = new Date()
        await updateCallLogByCallSid(CallSid, updateData)
      } catch (err: any) {
        logger.error('Failed to update inbound call status:', err)
      }
    }
    voiceResponse.hangup()
  }

  res.type('text/xml')
  res.send(voiceResponse.toString())
})

/**
 * POST /call-center/voice/recording-complete
 * Called after <Record> completes — must return valid TwiML
 */
router.post(
  '/voice/recording-complete',
  async (req: Request, res: Response) => {
    const { CallSid, RecordingUrl, RecordingSid, RecordingDuration } =
      req.body || {}
    logger.info(
      `Voicemail recording complete for ${CallSid}: ${RecordingSid} (${RecordingDuration}s)`,
    )

    // Save recording to call log
    if (CallSid && RecordingUrl) {
      try {
        await updateCallLogByCallSid(CallSid, {
          recordingUrl: `${RecordingUrl}.mp3`,
          recordingSid: RecordingSid,
        })
      } catch (err: any) {
        logger.error('Failed to save voicemail recording:', err)
      }
    }

    const voiceResponse = new TwiML.VoiceResponse()
    voiceResponse.say('Thank you. Goodbye.')
    voiceResponse.hangup()
    res.type('text/xml')
    res.send(voiceResponse.toString())
  },
)

/**
 * POST /call-center/webhook
 * Twilio status callback webhook
 */
router.post('/webhook', async (req: Request, res: Response) => {
  const { CallSid, CallStatus, CallDuration } = req.body

  logger.info(
    `Twilio webhook: ${CallSid} - ${CallStatus}${CallDuration ? ` (${CallDuration}s)` : ''}`,
  )

  // Update call record in database
  if (CallSid) {
    try {
      const updateData: Record<string, any> = { status: CallStatus }
      if (CallDuration) updateData.duration = parseInt(CallDuration)
      if (CallStatus === 'completed') updateData.endedAt = new Date()
      await updateCallLogByCallSid(CallSid, updateData)
    } catch (err: any) {
      logger.error('Failed to update call from webhook:', err)
    }
  }

  res.status(200).send('OK')
})

/**
 * POST /call-center/webhook/recording
 * Twilio recording ready callback
 */
router.post('/webhook/recording', async (req: Request, res: Response) => {
  const { CallSid, RecordingSid, RecordingUrl, RecordingDuration } = req.body

  logger.info(
    `Recording ready for ${CallSid}: ${RecordingSid} (${RecordingDuration}s)`,
  )

  // Save recording URL to database
  if (CallSid && RecordingUrl) {
    try {
      await updateCallLogByCallSid(CallSid, {
        recordingUrl: `${RecordingUrl}.mp3`,
        recordingSid: RecordingSid,
      })
    } catch (err: any) {
      logger.error('Failed to save recording:', err)
    }
  }

  res.status(200).send('OK')
})

export default router
