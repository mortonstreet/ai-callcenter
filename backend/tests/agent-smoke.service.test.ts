import assert from 'node:assert/strict'
import test from 'node:test'
import { runAgentSmokeTestBundle } from '../src/services/agent-smoke.service'

const buildProviderConfig = () => ({
  conversation_config: {
    agent: {
      first_message: 'Hello from RevCenter.',
      prompt: {
        prompt:
          'You are a workflow assistant with transfer and fallback routing enabled.',
        tools: [{ name: 'crm_lookup' }],
        knowledge_base: [{ id: 'kb_1' }],
      },
      workflow: {
        nodes: [{ id: 'fallback_route' }],
      },
    },
  },
  platform_settings: {
    webhooks: {
      post_call_url: 'https://example.com/webhook',
    },
  },
})

const buildInput = (mode: 'runtime' | 'provisioning') => ({
  mode,
  agent: {
    id: 'agent_123',
    organizationId: 'org_123',
    name: 'Test Agent',
    useCase: 'support',
    webhookSecret: 'wsec_test_123',
  },
  providerConfig: buildProviderConfig(),
})

test('runAgentSmokeTestBundle skips webhook signature call in runtime mode', async () => {
  const originalFetch = globalThis.fetch
  let fetchCalls = 0

  ;(globalThis as { fetch: typeof fetch }).fetch = async () => {
    fetchCalls += 1
    throw new Error(
      'runtime mode should not call fetch for webhook signature scenario',
    )
  }

  try {
    const result = await runAgentSmokeTestBundle(buildInput('runtime'))
    const webhookScenario = result.scenarios.find(
      (scenario) => scenario.id === 'webhook_signature_test_call',
    )

    assert.equal(fetchCalls, 0)
    assert.equal(result.status, 'ok')
    assert.equal(webhookScenario?.status, 'passed')
    assert.match(webhookScenario?.message || '', /skipped in runtime mode/i)
  } finally {
    ;(globalThis as { fetch: typeof fetch }).fetch = originalFetch
  }
})

test('runAgentSmokeTestBundle executes webhook signature call in provisioning mode', async () => {
  const originalFetch = globalThis.fetch
  let fetchCalls = 0

  ;(globalThis as { fetch: typeof fetch }).fetch = async () => {
    fetchCalls += 1
    return new Response('', { status: 200 })
  }

  try {
    const result = await runAgentSmokeTestBundle(buildInput('provisioning'))
    const webhookScenario = result.scenarios.find(
      (scenario) => scenario.id === 'webhook_signature_test_call',
    )

    assert.equal(fetchCalls, 1)
    assert.equal(result.status, 'ok')
    assert.equal(webhookScenario?.status, 'passed')
  } finally {
    ;(globalThis as { fetch: typeof fetch }).fetch = originalFetch
  }
})
