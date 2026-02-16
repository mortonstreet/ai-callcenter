import { AuthRequestHandler } from '@/types/handlers'
import { config } from '@/config'
import {
  getElevenLabsClient,
  initElevenLabsClient,
} from '@/clients/elevenlabs.client'
import logger from '@/lib/logger'

const getClient = () => {
  const apiKey = config.elevenLabs?.apiKey || process.env.ELEVEN_LABS_API_KEY
  if (!apiKey) {
    throw new Error('ELEVEN_LABS_API_KEY is not configured')
  }
  try {
    return getElevenLabsClient()
  } catch {
    return initElevenLabsClient(apiKey)
  }
}

export const healthCheck: AuthRequestHandler<{}> = async (_req, res) => {
  try {
    const client = getClient()
    const voices = await client.listVoices()
    console.log('[elevenlabs] connection ok', {
      voiceCount: voices?.voices?.length ?? 0,
      sampleVoice: voices?.voices?.[0]?.voice_id ?? null,
    })
    logger.info('[elevenlabs] connection ok', {
      voiceCount: voices?.voices?.length ?? 0,
      sampleVoice: voices?.voices?.[0]?.voice_id ?? null,
    })
    return res.json({
      ok: true,
      voiceCount: voices?.voices?.length ?? 0,
      sampleVoice: voices?.voices?.[0] ?? null,
    })
  } catch (error: any) {
    console.error('[elevenlabs] connection failed', {
      error: error?.message || String(error),
    })
    logger.error('[elevenlabs] connection failed', {
      error: error?.message || String(error),
    })
    return res.status(500).json({
      error: 'Failed to reach ElevenLabs',
      details: error?.message || String(error),
    })
  }
}

export const listVoices: AuthRequestHandler<{}> = async (_req, res) => {
  try {
    const client = getClient()
    const voices = await client.listVoices()
    return res.json({ voices: voices.voices || [] })
  } catch (error: any) {
    console.error('[elevenlabs] listVoices failed', {
      error: error?.message || String(error),
    })
    logger.error('[elevenlabs] listVoices failed', {
      error: error?.message || String(error),
    })
    return res.status(500).json({
      error: 'Failed to list voices',
      details: error?.message || String(error),
    })
  }
}
