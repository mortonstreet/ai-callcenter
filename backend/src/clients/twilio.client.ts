import Twilio from 'twilio'

const { jwt } = Twilio
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

export interface TwilioCredentials {
  accountSid: string
  authToken: string
  phoneNumber: string
  apiKeySid?: string
  apiKeySecret?: string
  twimlAppSid?: string
}

class TwilioClient {
  private client: Twilio.Twilio | null = null
  private currentCredentials: TwilioCredentials | null = null

  /**
   * Set credentials from database config (org-level)
   */
  setCredentials(creds: TwilioCredentials) {
    // If credentials changed, reset client
    if (
      this.currentCredentials?.accountSid !== creds.accountSid ||
      this.currentCredentials?.authToken !== creds.authToken
    ) {
      this.client = null
    }
    this.currentCredentials = creds
  }

  /**
   * Clear any cached credentials/client
   */
  clearCredentials() {
    this.client = null
    this.currentCredentials = null
  }

  private getCredentials(): TwilioCredentials | null {
    // Use explicit credentials if set (from DB), otherwise fall back to env
    if (this.currentCredentials) {
      return this.currentCredentials
    }

    if (config.twilio.accountSid && config.twilio.authToken && config.twilio.phoneNumber) {
      return {
        accountSid: config.twilio.accountSid,
        authToken: config.twilio.authToken,
        phoneNumber: config.twilio.phoneNumber,
        apiKeySid: config.twilio.apiKeySid || undefined,
        apiKeySecret: config.twilio.apiKeySecret || undefined,
        twimlAppSid: config.twilio.twimlAppSid || undefined,
      }
    }

    return null
  }

  private getClient(): Twilio.Twilio {
    const creds = this.getCredentials()
    if (!creds) {
      throw new Error('Twilio credentials not configured')
    }

    if (!this.client) {
      this.client = Twilio(creds.accountSid, creds.authToken)
    }
    return this.client
  }

  isConfigured(): boolean {
    const creds = this.getCredentials()
    return !!(creds?.accountSid && creds?.authToken && creds?.phoneNumber)
  }

  isVoiceConfigured(): boolean {
    const creds = this.getCredentials()
    return !!(
      creds?.accountSid &&
      creds?.apiKeySid &&
      creds?.apiKeySecret &&
      creds?.twimlAppSid
    )
  }

  getPhoneNumber(): string | null {
    return this.getCredentials()?.phoneNumber || null
  }

  generateAccessToken(identity: string): string {
    const creds = this.getCredentials()
    if (!creds?.apiKeySid || !creds?.apiKeySecret || !creds?.twimlAppSid) {
      throw new Error(
        'Twilio Voice SDK not configured. Need API Key and TwiML App.',
      )
    }

    const accessToken = new AccessToken(
      creds.accountSid,
      creds.apiKeySid,
      creds.apiKeySecret,
      { identity },
    )

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: creds.twimlAppSid,
      incomingAllow: true,
    })

    accessToken.addGrant(voiceGrant)

    logger.info(`Generated access token for identity: ${identity}`)

    return accessToken.toJwt()
  }

  async makeCall(to: string, statusCallbackUrl?: string): Promise<CallResult> {
    try {
      const client = this.getClient()
      const creds = this.getCredentials()!
      const toNormalized = this.normalizePhoneNumber(to)

      logger.info(
        `Initiating call from ${creds.phoneNumber} to ${toNormalized}`,
      )

      const callParams = {
        to: toNormalized,
        from: creds.phoneNumber,
        twiml: `<Response><Say voice="alice">Hello! This is a test call from RevCenter. Your callback request has been received. Goodbye!</Say></Response>`,
        record: true,
        recordingStatusCallback: statusCallbackUrl
          ? `${statusCallbackUrl}/recording`
          : undefined,
        recordingStatusCallbackEvent: ['completed'],
        statusCallback: statusCallbackUrl,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
      }

      const call = await client.calls.create(callParams)

      logger.info(`Call initiated: ${call.sid} - Status: ${call.status}`)

      return {
        success: true,
        callSid: call.sid,
        status: call.status,
      }
    } catch (error: any) {
      const errorDetails = `Code: ${error.code}, Status: ${error.status}, Message: ${error.message}, MoreInfo: ${error.moreInfo}`
      logger.error(`Failed to make call: ${errorDetails}`)
      return {
        success: false,
        error: error.message || 'Failed to initiate call',
      }
    }
  }

  async endCall(callSid: string): Promise<CallResult> {
    try {
      const client = this.getClient()

      const call = await client.calls(callSid).update({
        status: 'completed',
      })

      logger.info(`Call ended: ${callSid}`)

      return {
        success: true,
        callSid: call.sid,
        status: call.status,
      }
    } catch (error: any) {
      logger.error('Failed to end call:', error)
      return {
        success: false,
        error: error.message || 'Failed to end call',
      }
    }
  }

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
      logger.error('Failed to get call:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

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
      logger.error('Failed to get recordings:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async listAlerts(params?: {
    startDate?: Date
    endDate?: Date
    logLevel?: string
    limit?: number
  }) {
    try {
      const client = this.getClient()
      const listParams: Record<string, any> = {}
      if (params?.startDate) listParams.startDate = params.startDate
      if (params?.endDate) listParams.endDate = params.endDate
      if (params?.logLevel) listParams.logLevel = params.logLevel
      if (params?.limit) listParams.limit = params.limit

      const alerts = await client.monitor.v1.alerts.list(listParams)

      return {
        success: true,
        alerts,
      }
    } catch (error: any) {
      logger.error('Failed to list alerts:', error)
      return {
        success: false,
        error: error.message,
        alerts: [],
      }
    }
  }

  async getAlert(alertSid: string) {
    try {
      const client = this.getClient()
      const alert = await client.monitor.v1.alerts(alertSid).fetch()

      return {
        success: true,
        alert,
      }
    } catch (error: any) {
      logger.error('Failed to get alert:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

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
      logger.error('Failed to list phone numbers:', {
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
  normalizePhoneNumber(phone: string): string {
    let cleaned = phone.replace(/[^\d+]/g, '')

    if (!cleaned.startsWith('+') && cleaned.length === 10) {
      cleaned = '+1' + cleaned
    }

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
