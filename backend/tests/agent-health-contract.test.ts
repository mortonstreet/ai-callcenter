import assert from 'node:assert/strict'
import test from 'node:test'
import { AgentHealthResponseSchema } from '@shared/types/src'

test('AgentHealthResponseSchema validates v2 multi-check payload', () => {
  const payload = {
    agentId: 'agent_123',
    organizationId: 'org_123',
    status: 'degraded',
    degradedMode: {
      enabled: true,
      reason: 'readiness_checks_failed',
    },
    activation: {
      allowed: true,
      deniedBy: [],
    },
    checks: {
      provider: {
        status: 'ok',
        checkedAt: new Date().toISOString(),
        message: 'Provider healthy',
        blocking: true,
        provider: 'eleven_labs',
      },
      profile: {
        status: 'ok',
        checkedAt: new Date().toISOString(),
        message: 'Profile hash valid',
        blocking: false,
      },
      workflow: {
        status: 'degraded',
        checkedAt: new Date().toISOString(),
        message: 'Provider graph unavailable',
        blocking: true,
        remediationAction: 'Verify workflow profile',
      },
      knowledge_base: {
        status: 'ok',
        checkedAt: new Date().toISOString(),
        message: 'KB source threshold met',
        blocking: false,
      },
      tools_mcp: {
        status: 'ok',
        checkedAt: new Date().toISOString(),
        message: 'Tools and MCP healthy',
        blocking: false,
      },
      webhook: {
        status: 'ok',
        checkedAt: new Date().toISOString(),
        message: 'Webhook reachable',
        blocking: true,
      },
      tests: {
        status: 'ok',
        checkedAt: new Date().toISOString(),
        message: 'Smoke bundle passed',
        blocking: true,
      },
      queues: {
        status: 'degraded',
        checkedAt: new Date().toISOString(),
        message: 'Retry queue elevated',
        blocking: false,
        remediationAction: 'Drain queue',
      },
    },
  }

  const parsed = AgentHealthResponseSchema.parse(payload)
  assert.equal(parsed.status, 'degraded')
  assert.equal(parsed.checks.workflow.blocking, true)
  assert.equal(parsed.activation.allowed, true)
})

test('AgentHealthResponseSchema rejects missing per-check blocking flag', () => {
  const invalidPayload = {
    agentId: 'agent_123',
    organizationId: 'org_123',
    status: 'healthy',
    degradedMode: {
      enabled: false,
      reason: null,
    },
    activation: {
      allowed: true,
      deniedBy: [],
    },
    checks: {
      provider: {
        status: 'ok',
        checkedAt: new Date().toISOString(),
        message: 'Provider healthy',
        provider: 'eleven_labs',
      },
      profile: {
        status: 'ok',
        checkedAt: new Date().toISOString(),
        message: 'Profile hash valid',
        blocking: false,
      },
      workflow: {
        status: 'ok',
        checkedAt: new Date().toISOString(),
        message: 'Workflow good',
        blocking: true,
      },
      knowledge_base: {
        status: 'ok',
        checkedAt: new Date().toISOString(),
        message: 'KB good',
        blocking: false,
      },
      tools_mcp: {
        status: 'ok',
        checkedAt: new Date().toISOString(),
        message: 'Tools good',
        blocking: false,
      },
      webhook: {
        status: 'ok',
        checkedAt: new Date().toISOString(),
        message: 'Webhook good',
        blocking: true,
      },
      tests: {
        status: 'ok',
        checkedAt: new Date().toISOString(),
        message: 'Tests good',
        blocking: true,
      },
      queues: {
        status: 'ok',
        checkedAt: new Date().toISOString(),
        message: 'Queue good',
        blocking: false,
      },
    },
  }

  assert.throws(() => AgentHealthResponseSchema.parse(invalidPayload))
})

