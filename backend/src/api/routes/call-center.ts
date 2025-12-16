import { Router } from 'express'
import { z } from 'zod'
import { withBetterAuth, validateIsAdmin } from '../middlewares/auth'
import { validateAndMerge } from '../middlewares/validationMiddleware'
import { twilioClient } from '@/clients/twilio.client'
import { config } from '@/config'
import logger from '@/lib/logger'
import type { Request, Response } from 'express'
import { twiml as TwiML } from 'twilio'

const router = Router()

// =============================================================================
// SCHEMAS
// =============================================================================

const MakeCallSchema = z.object({
  to: z.string().min(10, 'Phone number is required'),
  fromNumberId: z.string().optional(), // For future multi-number support
})

const EndCallSchema = z.object({
  callSid: z.string(),
})

const CallOutcomeSchema = z.object({
  callSid: z.string(),
  outcome: z.enum(['booked', 'follow_up', 'not_interested', 'no_answer', 'voicemail', 'wrong_number']),
  notes: z.string().optional(),
})

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /call-center/status
 * Check if Twilio is configured and ready
 */
router.get(
  '/status',
  withBetterAuth,
  validateIsAdmin,
  async (_req: Request, res: Response) => {
    const isConfigured = twilioClient.isConfigured()
    const isVoiceConfigured = twilioClient.isVoiceConfigured()
    
    res.json({
      configured: isConfigured,
      voiceConfigured: isVoiceConfigured,
      phoneNumber: isConfigured ? config.twilio.phoneNumber : null,
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
      if (!twilioClient.isVoiceConfigured()) {
        return res.status(400).json({ 
          error: 'Voice calling not configured. Need TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, and TWILIO_TWIML_APP_SID.' 
        })
      }

      // Use user ID as identity for the token
      const user = (req as any).user
      const identity = `agent_${user.id}`
      
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
  async (_req: Request, res: Response) => {
    // For now, return the configured phone number
    // In the future, this could list all numbers from Twilio
    if (!twilioClient.isConfigured()) {
      return res.status(400).json({ error: 'Twilio not configured' })
    }

    // Try to list numbers from Twilio account
    const result = await twilioClient.listPhoneNumbers()
    
    if (result.success && result.numbers) {
      return res.json({
        numbers: result.numbers,
      })
    }

    // Fallback to configured number
    res.json({
      numbers: [
        {
          sid: 'default',
          phoneNumber: config.twilio.phoneNumber,
          friendlyName: 'Primary Line',
        },
      ],
    })
  },
)

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

    if (!twilioClient.isConfigured()) {
      return res.status(400).json({ error: 'Twilio not configured' })
    }

    // Build status callback URL
    const statusCallbackUrl = `${config.backendUrl}/api/call-center/webhook`

    logger.info(`📞 Admin initiating call to ${to}`)

    const result = await twilioClient.makeCall(to, statusCallbackUrl)

    if (!result.success) {
      return res.status(400).json({ error: result.error })
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

    const result = await twilioClient.endCall(callSid)

    if (!result.success) {
      return res.status(400).json({ error: result.error })
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

    // For now, just log the outcome
    // In the future, this will update the database
    logger.info(`📝 Call ${callSid} outcome: ${outcome}${notes ? ` - ${notes}` : ''}`)

    res.json({
      success: true,
      callSid,
      outcome,
    })
  },
)

// =============================================================================
// WEBHOOKS (from Twilio)
// =============================================================================

/**
 * POST /call-center/voice
 * TwiML App voice webhook - called when browser initiates an outbound call
 * This generates TwiML to dial the destination number
 */
router.post('/voice', async (req: Request, res: Response) => {
  const { To, From, Caller } = req.body
  
  logger.info(`🎤 Voice webhook - To: ${To}, From: ${From}, Caller: ${Caller}`)

  const voiceResponse = new TwiML.VoiceResponse()

  if (To) {
    // Outbound call - dial the destination number
    const dial = voiceResponse.dial({
      callerId: config.twilio.phoneNumber,
      record: 'record-from-answer-dual', // Record both sides
      recordingStatusCallback: `${config.backendUrl}/api/call-center/webhook/recording`,
      recordingStatusCallbackEvent: ['completed'],
    })
    
    // Check if it's a phone number or a client
    if (To.startsWith('client:')) {
      dial.client(To.replace('client:', ''))
    } else {
      dial.number(To)
    }
  } else {
    // No destination - just say something
    voiceResponse.say('No destination specified.')
  }

  res.type('text/xml')
  res.send(voiceResponse.toString())
})

/**
 * POST /call-center/webhook
 * Twilio status callback webhook
 */
router.post('/webhook', async (req: Request, res: Response) => {
  const { CallSid, CallStatus, CallDuration } = req.body

  logger.info(`📲 Twilio webhook: ${CallSid} - ${CallStatus}${CallDuration ? ` (${CallDuration}s)` : ''}`)

  // TODO: Update call record in database
  // TODO: Emit WebSocket event to frontend for real-time updates

  // Twilio expects 200 OK
  res.status(200).send('OK')
})

/**
 * POST /call-center/webhook/recording
 * Twilio recording ready callback
 */
router.post('/webhook/recording', async (req: Request, res: Response) => {
  const { CallSid, RecordingSid, RecordingUrl, RecordingDuration } = req.body

  logger.info(`🎙️ Recording ready for ${CallSid}: ${RecordingSid} (${RecordingDuration}s)`)

  // TODO: Save recording URL to database

  res.status(200).send('OK')
})

export default router

