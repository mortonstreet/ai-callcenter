import assert from 'node:assert/strict'
import test from 'node:test'
import { buildElevenLabsUpdatePayload } from '../src/services/elevenlabs-update-payload'

test('maps core-tab update fields to ElevenLabs payload contract', () => {
  const payload = buildElevenLabsUpdatePayload({
    llmModel: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 1024,
    firstMessage: 'Hello there',
    language: 'en',
    toolIds: ['lookup_customer', 'book_appointment'],
    builtInTools: ['end_call', 'language_detection'],
    workflow: {
      defaults: {
        fallback_node: 'fallback_general_information',
      },
      nodes: [{ id: 'fallback_general_information' }],
    },
    dataCollection: {
      schema: [{ key: 'resolution_status', type: 'enum', required: true }],
    },
    evaluationCriteria: [
      {
        id: 'accuracy',
        name: 'Accuracy',
        type: 'quality',
      },
    ],
    security: {
      authTokenEnabled: true,
      allowedOrigins: ['https://app.revcenter.ai'],
    },
    callLimits: {
      maxConcurrent: 10,
      dailyCap: 1000,
    },
    privacy: {
      recordingRetention: '90',
    },
    webhooks: {
      postCallUrl: 'https://api.revcenter.ai/webhooks/elevenlabs/post-call',
      events: ['call.ended'],
    },
    conversation: {
      maxDurationSeconds: 3600,
      silenceEndCallTimeout: 30,
      turnTimeout: 10,
      textOnlyMode: false,
    },
  })

  assert.deepEqual(payload.tool_ids, ['lookup_customer', 'book_appointment'])
  assert.deepEqual(payload.built_in_tools, ['end_call', 'language_detection'])
  assert.deepEqual(payload.workflow.defaults, {
    fallback_node: 'fallback_general_information',
  })
  assert.equal(payload.conversation_config.agent.prompt.llm, 'gpt-4o')
  assert.equal(payload.conversation_config.agent.prompt.temperature, 0.7)
  assert.equal(payload.conversation_config.agent.prompt.max_tokens, 1024)
  assert.equal(payload.conversation_config.agent.first_message, 'Hello there')
  assert.equal(payload.conversation_config.agent.language, 'en')
  assert.equal(payload.platform_settings.security.auth_token_enabled, true)
  assert.deepEqual(payload.platform_settings.security.allowed_origins, [
    'https://app.revcenter.ai',
  ])
  assert.equal(payload.platform_settings.call_limits.max_concurrent, 10)
  assert.equal(payload.platform_settings.call_limits.daily_cap, 1000)
  assert.equal(payload.platform_settings.privacy.recording_retention, '90')
  assert.equal(
    payload.platform_settings.webhooks.post_call_url,
    'https://api.revcenter.ai/webhooks/elevenlabs/post-call',
  )
  assert.deepEqual(payload.platform_settings.webhooks.events, ['call.ended'])
  assert.equal(payload.conversation_config.max_duration_seconds, 3600)
  assert.equal(payload.conversation_config.silence_end_call_timeout, 30)
  assert.equal(payload.conversation_config.turn_timeout, 10)
  assert.equal(payload.conversation_config.text_only_mode, false)
})
