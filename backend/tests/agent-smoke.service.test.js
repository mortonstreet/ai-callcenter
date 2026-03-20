'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const strict_1 = require('node:assert/strict')
const node_test_1 = require('node:test')
const agent_smoke_service_1 = require('../src/services/agent-smoke.service')
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
const buildInput = (mode) => ({
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
;(0, node_test_1.default)(
  'runAgentSmokeTestBundle skips webhook signature call in runtime mode',
  async () => {
    const originalFetch = globalThis.fetch
    let fetchCalls = 0
    globalThis.fetch = async () => {
      fetchCalls += 1
      throw new Error(
        'runtime mode should not call fetch for webhook signature scenario',
      )
    }
    try {
      const result = await (0, agent_smoke_service_1.runAgentSmokeTestBundle)(
        buildInput('runtime'),
      )
      const webhookScenario = result.scenarios.find(
        (scenario) => scenario.id === 'webhook_signature_test_call',
      )
      strict_1.default.equal(fetchCalls, 0)
      strict_1.default.equal(result.status, 'ok')
      strict_1.default.equal(webhookScenario?.status, 'passed')
      strict_1.default.match(
        webhookScenario?.message || '',
        /skipped in runtime mode/i,
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  },
)
;(0, node_test_1.default)(
  'runAgentSmokeTestBundle executes webhook signature call in provisioning mode',
  async () => {
    const originalFetch = globalThis.fetch
    let fetchCalls = 0
    globalThis.fetch = async () => {
      fetchCalls += 1
      return new Response('', { status: 200 })
    }
    try {
      const result = await (0, agent_smoke_service_1.runAgentSmokeTestBundle)(
        buildInput('provisioning'),
      )
      const webhookScenario = result.scenarios.find(
        (scenario) => scenario.id === 'webhook_signature_test_call',
      )
      strict_1.default.equal(fetchCalls, 1)
      strict_1.default.equal(result.status, 'ok')
      strict_1.default.equal(webhookScenario?.status, 'passed')
    } finally {
      globalThis.fetch = originalFetch
    }
  },
)
