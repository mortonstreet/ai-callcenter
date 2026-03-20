'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const strict_1 = require('node:assert/strict')
const node_test_1 = require('node:test')
const agent_health_core_1 = require('../src/services/agent-health.core')
const buildChecks = (overrides) => {
  const baseCheck = {
    status: 'ok',
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
;(0, node_test_1.default)(
  'resolveAgentHealthStatus returns blocked when blocking check fails',
  () => {
    const checks = buildChecks({
      webhook: {
        status: 'failed',
        checkedAt: new Date().toISOString(),
        message: 'webhook missing',
        blocking: true,
        remediationAction: 'configure webhook',
      },
    })
    const status = (0, agent_health_core_1.resolveAgentHealthStatus)(checks)
    const activation = (0, agent_health_core_1.buildAgentActivationGate)(checks)
    strict_1.default.equal(status, 'blocked')
    strict_1.default.equal(activation.allowed, false)
    strict_1.default.deepEqual(activation.deniedBy, ['webhook'])
  },
)
;(0, node_test_1.default)(
  'resolveAgentHealthStatus returns degraded for non-blocking failures',
  () => {
    const checks = buildChecks({
      knowledge_base: {
        status: 'failed',
        checkedAt: new Date().toISOString(),
        message: 'missing source',
        blocking: false,
        remediationAction: 'add source',
      },
    })
    const status = (0, agent_health_core_1.resolveAgentHealthStatus)(checks)
    const activation = (0, agent_health_core_1.buildAgentActivationGate)(checks)
    strict_1.default.equal(status, 'degraded')
    strict_1.default.equal(activation.allowed, true)
    strict_1.default.deepEqual(activation.deniedBy, [])
  },
)
;(0, node_test_1.default)(
  'resolveAgentHealthStatus returns degraded when blocking checks are degraded but not failed',
  () => {
    const checks = buildChecks({
      workflow: {
        status: 'degraded',
        checkedAt: new Date().toISOString(),
        message: 'provider did not expose graph',
        blocking: true,
        remediationAction: 'verify workflow profile',
      },
    })
    const status = (0, agent_health_core_1.resolveAgentHealthStatus)(checks)
    const activation = (0, agent_health_core_1.buildAgentActivationGate)(checks)
    strict_1.default.equal(status, 'degraded')
    strict_1.default.equal(activation.allowed, true)
  },
)
;(0, node_test_1.default)(
  'resolveAgentHealthStatus returns healthy when all checks pass',
  () => {
    const checks = buildChecks({})
    const status = (0, agent_health_core_1.resolveAgentHealthStatus)(checks)
    const activation = (0, agent_health_core_1.buildAgentActivationGate)(checks)
    strict_1.default.equal(status, 'healthy')
    strict_1.default.equal(activation.allowed, true)
    strict_1.default.deepEqual(activation.deniedBy, [])
  },
)
