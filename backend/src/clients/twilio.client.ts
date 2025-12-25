import Twilio from 'twilio'
import { jwt } from 'twilio'
import { config } from '@/config'
import logger from '@/lib/logger'

const { AccessToken } = jwt
const VoiceGrant = AccessToken.VoiceGrant

export interface CallResult {
  success: boolean
  callSid?: string
  status?: string
  error?: string
}

export interface CallStatusUpdate {
  callSid: string
  status: string
  duration?: number
  recordingUrl?: string
}

class TwilioClient {
  private client: Twilio.Twilio | null = null
  private initialized = false

  private getClient(): Twilio.Twilio {
    if (!this.client) {
      if (!config.twilio.accountSid || !config.twilio.authToken) {
        throw new Error('Twilio credentials not configured')
      }
      this.client = Twilio(config.twilio.accountSid, config.twilio.authToken)
      this.initialized = true
    }
    return this.client
  }

  isConfigured(): boolean {
    return !!(
      config.twilio.accountSid &&
      config.twilio.authToken &&
      config.twilio.phoneNumber
    )
  }

  /**
   * Check if browser-based voice calling is configured
   * Requires API Key and TwiML App
   */
  isVoiceConfigured(): boolean {
    return !!(
      config.twilio.accountSid &&
      config.twilio.apiKeySid &&
      config.twilio.apiKeySecret &&
      config.twilio.twimlAppSid
    )
  }

  /**
   * Generate Access Token for browser-based calling
   * The token allows the browser to connect to Twilio's Voice SDK
   */
  generateAccessToken(identity: string): string {
    if (!this.isVoiceConfigured()) {
      throw new Error(
        'Twilio Voice SDK not configured. Need API Key and TwiML App.',
      )
    }

    // Create an access token
    const accessToken = new AccessToken(
      config.twilio.accountSid,
      config.twilio.apiKeySid,
      config.twilio.apiKeySecret,
      { identity },
    )

    // Create a Voice grant and add it to the token
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: config.twilio.twimlAppSid,
      incomingAllow: true, // Allow incoming calls too
    })

    accessToken.addGrant(voiceGrant)

    logger.info(`🎫 Generated access token for identity: ${identity}`)

    return accessToken.toJwt()
  }

  /**
   * Make an outbound call with recording enabled
   */
  async makeCall(to: string, statusCallbackUrl?: string): Promise<CallResult> {
    try {
      const client = this.getClient()

      // Normalize phone number to E.164 format
      const toNormalized = this.normalizePhoneNumber(to)

      logger.info(
        `📞 Initiating call from ${config.twilio.phoneNumber} to ${toNormalized}`,
      )

      const callParams = {
        to: toNormalized,
        from: config.twilio.phoneNumber,
        // Simple TwiML - just say a message (for testing)
        twiml: `<Response><Say voice="alice">Hello! This is a test call from RevCenter. Your callback request has been received. Goodbye!</Say></Response>`,
        // Enable recording
        record: true,
        recordingStatusCallback: statusCallbackUrl
          ? `${statusCallbackUrl}/recording`
          : undefined,
        recordingStatusCallbackEvent: ['completed'],
        // Status callbacks
        statusCallback: statusCallbackUrl,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
      }

      const call = await client.calls.create(callParams)

      logger.info(`✅ Call initiated: ${call.sid} - Status: ${call.status}`)

      return {
        success: true,
        callSid: call.sid,
        status: call.status,
      }
    } catch (error: any) {
      const errorDetails = `Code: ${error.code}, Status: ${error.status}, Message: ${error.message}, MoreInfo: ${error.moreInfo}`
      logger.error(`❌ Failed to make call: ${errorDetails}`)
      return {
        success: false,
        error: error.message || 'Failed to initiate call',
      }
    }
  }

  /**
   * End an active call
   */
  async endCall(callSid: string): Promise<CallResult> {
    try {
      const client = this.getClient()

      const call = await client.calls(callSid).update({
        status: 'completed',
      })

      logger.info(`📴 Call ended: ${callSid}`)

      return {
        success: true,
        callSid: call.sid,
        status: call.status,
      }
    } catch (error: any) {
      logger.error('❌ Failed to end call:', error)
      return {
        success: false,
        error: error.message || 'Failed to end call',
      }
    }
  }

  /**
   * Get call details
   */
  async getCall(callSid: string) {
    try {
      const client = this.getClient()
      const call = await client.calls(callSid).fetch()
      return {
        success: true,
        call: {
          sid: call.sid,
          status: call.status,
          duration: call.duration,
          startTime: call.startTime,
          endTime: call.endTime,
          from: call.from,
          to: call.to,
        },
      }
    } catch (error: any) {
      logger.error('❌ Failed to get call:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Get recording for a call
   */
  async getRecordings(callSid: string) {
    try {
      const client = this.getClient()
      const recordings = await client.recordings.list({ callSid })

      return {
        success: true,
        recordings: recordings.map((r) => ({
          sid: r.sid,
          duration: r.duration,
          url: `https://api.twilio.com${r.uri.replace('.json', '.mp3')}`,
        })),
      }
    } catch (error: any) {
      logger.error('❌ Failed to get recordings:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * List available phone numbers on the account
   */
  async listPhoneNumbers() {
    try {
      const client = this.getClient()
      const numbers = await client.incomingPhoneNumbers.list()

      return {
        success: true,
        numbers: numbers.map((n) => ({
          sid: n.sid,
          phoneNumber: n.phoneNumber,
          friendlyName: n.friendlyName,
        })),
      }
    } catch (error: any) {
      logger.error('❌ Failed to list phone numbers:', {
        message: error.message,
        code: error.code,
        moreInfo: error.moreInfo,
        status: error.status,
      })
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Normalize phone number to E.164 format
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except leading +
    let cleaned = phone.replace(/[^\d+]/g, '')

    // If no + prefix and 10 digits, assume US number
    if (!cleaned.startsWith('+') && cleaned.length === 10) {
      cleaned = '+1' + cleaned
    }

    // If no + prefix and 11 digits starting with 1, add +
    if (
      !cleaned.startsWith('+') &&
      cleaned.length === 11 &&
      cleaned.startsWith('1')
    ) {
      cleaned = '+' + cleaned
    }

    return cleaned
  }
}

// Export singleton instance
export const twilioClient = new TwilioClient()
