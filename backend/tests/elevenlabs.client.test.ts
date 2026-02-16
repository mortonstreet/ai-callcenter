import assert from 'node:assert/strict'
import test from 'node:test'
import { ElevenLabsClient } from '../src/clients/elevenlabs.client'

type FetchCall = {
  input: RequestInfo | URL
  init?: RequestInit
}

const getHeader = (
  headers: HeadersInit | undefined,
  key: string,
): string | null => {
  if (!headers) return null
  if (headers instanceof Headers) {
    return headers.get(key)
  }
  if (Array.isArray(headers)) {
    const found = headers.find(([headerKey]) => headerKey === key)
    return found ? found[1] : null
  }
  return headers[key] ?? null
}

test('createCustomVoice sends multipart request to /voices/add', async () => {
  const originalFetch = globalThis.fetch
  const calls: FetchCall[] = []

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init })
    return new Response(JSON.stringify({ voice_id: 'voice_custom_123' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const client = new ElevenLabsClient('test_api_key')
    const response = await client.createCustomVoice({
      name: 'Acme Voice',
      description: 'Provisioned for onboarding',
      samples: [
        {
          filename: 'sample.wav',
          content: Buffer.from('test-audio'),
          contentType: 'audio/wav',
        },
      ],
    })

    assert.equal(response.voice_id, 'voice_custom_123')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].input, 'https://api.elevenlabs.io/v1/voices/add')
    assert.equal(getHeader(calls[0].init?.headers, 'xi-api-key'), 'test_api_key')
    assert.equal(calls[0].init?.body instanceof FormData, true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('trainCustomVoice posts multipart edit request for a voice id', async () => {
  const originalFetch = globalThis.fetch
  const calls: FetchCall[] = []

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init })
    return new Response(JSON.stringify({ voice_id: 'voice_custom_123' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const client = new ElevenLabsClient('test_api_key')
    const response = await client.trainCustomVoice('voice_custom_123', {
      samples: [
        {
          filename: 'more-training.wav',
          content: Buffer.from('sample'),
          contentType: 'audio/wav',
        },
      ],
    })

    assert.equal(response.voice_id, 'voice_custom_123')
    assert.equal(calls.length, 1)
    assert.equal(
      calls[0].input,
      'https://api.elevenlabs.io/v1/voices/voice_custom_123/edit',
    )
    assert.equal(calls[0].init?.body instanceof FormData, true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('trainCustomVoice skips API request when no samples are provided', async () => {
  const originalFetch = globalThis.fetch
  let called = false

  globalThis.fetch = (async () => {
    called = true
    return new Response('{}')
  }) as typeof fetch

  try {
    const client = new ElevenLabsClient('test_api_key')
    const response = await client.trainCustomVoice('voice_custom_123', {
      samples: [],
    })

    assert.equal(called, false)
    assert.equal(response.voice_id, 'voice_custom_123')
    assert.equal(response.training_status, 'skipped')
  } finally {
    globalThis.fetch = originalFetch
  }
})
