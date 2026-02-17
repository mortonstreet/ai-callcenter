import { config } from '@/config'
import { app } from '@/api/app'
import { twilioClient } from '@/clients/twilio.client'
import { initElevenLabsClient } from '@/clients/elevenlabs.client'
import { db } from '@/lib/db'
import logger from '@/lib/logger'
import { initQueuesIfAvailable } from '@/queues'
import { workerRuntime } from '@/queues/workers'

const asciiArt = `
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   ██████╗ ███████╗██╗   ██╗ ██████╗███████╗███╗   ██╗████████╗ ║
║   ██╔══██╗██╔════╝██║   ██║██╔════╝██╔════╝████╗  ██║╚══██╔══╝ ║
║   ██████╔╝█████╗  ██║   ██║██║     █████╗  ██╔██╗ ██║   ██║    ║
║   ██╔══██╗██╔══╝  ╚██╗ ██╔╝██║     ██╔══╝  ██║╚██╗██║   ██║    ║
║   ██║  ██║███████╗ ╚████╔╝ ╚██████╗███████╗██║ ╚████║   ██║    ║
║   ╚═╝  ╚═╝╚══════╝  ╚═══╝   ╚═════╝╚══════╝╚═╝  ╚═══╝   ╚═╝    ║
║                                                                ║
║            🚀 RevCenter - Port ${config.port} 🚀                     ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`

if (config.elevenLabs.apiKey) {
  initElevenLabsClient(config.elevenLabs.apiKey)
}

const startServer = async () => {
  // Initialize queue registry in the API process so enqueue calls do not silently skip.
  await initQueuesIfAvailable()

  if (config.workers.embeddedEnabled) {
    await workerRuntime.start()
    logger.info('Embedded queue workers started in API process')
  } else {
    logger.info('Embedded queue workers disabled by configuration')
  }

  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(asciiArt)

    // Auto-configure Twilio voice URLs on startup
    if (config.backendUrl && !config.backendUrl.includes('localhost')) {
      autoConfigureTwilioVoice().catch((err) =>
        logger.error('Twilio auto-config on startup failed:', err),
      )
    }
  })

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${config.port} is already in use`)
    } else {
      console.error('Server error:', err)
    }
    process.exit(1)
  })
}

async function autoConfigureTwilioVoice() {
  const configs = await db
    .selectFrom('twilio_config')
    .where('accountSid', 'is not', null)
    .where('authToken', 'is not', null)
    .where('phoneNumber', 'is not', null)
    .selectAll()
    .execute()

  const voiceUrl = `${config.backendUrl}/api/call-center/voice`

  for (const tc of configs) {
    if (!tc.accountSid || !tc.authToken || !tc.phoneNumber) continue

    try {
      twilioClient.setCredentials({
        accountSid: tc.accountSid,
        authToken: tc.authToken,
        phoneNumber: tc.phoneNumber,
        apiKeySid: tc.apiKeySid || undefined,
        apiKeySecret: tc.apiKeySecret || undefined,
        twimlAppSid: tc.twimlAppSid || undefined,
      })

      // 1. Set TwiML App voice URL
      if (tc.twimlAppSid) {
        await twilioClient.updateTwimlAppVoiceUrl(tc.twimlAppSid, voiceUrl)
      }

      // 2. Point phone number to TwiML App (or direct voiceUrl as fallback)
      await twilioClient.updatePhoneNumberVoiceConfig(
        tc.phoneNumber,
        voiceUrl,
        `${config.backendUrl}/api/call-center/webhook`,
        tc.twimlAppSid || undefined,
      )

      logger.info(
        `Startup: configured Twilio voice for org ${tc.organizationId} → ${voiceUrl}`,
      )
    } catch (err: any) {
      logger.error(
        `Startup: failed to configure Twilio for org ${tc.organizationId}:`,
        err,
      )
    } finally {
      twilioClient.clearCredentials()
    }
  }
}

startServer().catch((error) => {
  logger.error({ error }, 'Failed to start API server')
  process.exit(1)
})

export default app
