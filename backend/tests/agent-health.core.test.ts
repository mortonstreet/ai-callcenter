import assert from 'node:assert/strict'
import test from 'node:test'
import { AgentHealthChecks } from '@shared/types/src'
import {
  buildAgentActivationGate,
  resolveAgentHealthStatus,
} from '../src/services/agent-health.core'

const buildChecks = (
  overrides: Partial<Record<keyof AgentHealthChecks, AgentHealthChecks[keyof AgentHealthChecks]>>,
): AgentHealthChecks => {
  const baseCheck = {
    status: 'ok' as const,
    checkedAt: new Date().toISOString(),
    message: 'ok',
    blocking: false,
  }

  return {
    provider: { ...baseCheck, blocking: true, provider: 'eleven_labs' },
    profile: { ...baseCheck },
    workflow: { ...baseCheck, blocking: true },
    knowledge_base: { ...baseCheck },
    tools_mcp: { ...baseCheck },
    webhook: { ...baseCheck, blocking: true },
    tests: { ...baseCheck, blocking: true },
    queues: { ...baseCheck },
    ...overrides,
  }
}

test('resolveAgentHealthStatus returns blocked when blocking check fails', () => {
  const checks = buildChecks({
    webhook: {
      status: 'failed',
      checkedAt: new Date().toISOString(),
      message: 'webhook missing',
      blocking: true,
      remediationAction: 'configure webhook',
    },
  })

  const status = resolveAgentHealthStatus(checks)
  const activation = buildAgentActivationGate(checks)

  assert.equal(status, 'blocked')
  assert.equal(activation.allowed, false)
  assert.deepEqual(activation.deniedBy, ['webhook'])
})

test('resolveAgentHealthStatus returns degraded for non-blocking failures', () => {
  const checks = buildChecks({
    knowledge_base: {
      status: 'failed',
      checkedAt: new Date().toISOString(),
      message: 'missing source',
      blocking: false,
      remediationAction: 'add source',
    },
  })

  const status = resolveAgentHealthStatus(checks)
  const activation = buildAgentActivationGate(checks)

  assert.equal(status, 'degraded')
  assert.equal(activation.allowed, true)
  assert.deepEqual(activation.deniedBy, [])
})

test('resolveAgentHealthStatus returns degraded when blocking checks are degraded but not failed', () => {
  const checks = buildChecks({
    workflow: {
      status: 'degraded',
      checkedAt: new Date().toISOString(),
      message: 'provider did not expose graph',
      blocking: true,
      remediationAction: 'verify workflow profile',
    },
  })

  const status = resolveAgentHealthStatus(checks)
  const activation = buildAgentActivationGate(checks)

  assert.equal(status, 'degraded')
  assert.equal(activation.allowed, true)
})

test('resolveAgentHealthStatus returns healthy when all checks pass', () => {
  const checks = buildChecks({})
  const status = resolveAgentHealthStatus(checks)
  const activation = buildAgentActivationGate(checks)

  assert.equal(status, 'healthy')
  assert.equal(activation.allowed, true)
  assert.deepEqual(activation.deniedBy, [])
})

