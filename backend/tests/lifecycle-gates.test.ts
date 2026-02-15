import assert from 'node:assert/strict'
import test from 'node:test'
import {
  evaluateApiLifecycleGate,
  OrganizationLifecycleSnapshot,
} from '../src/lib/lifecycle-gates.core'

const buildSnapshot = (
  lifecycleStatus: OrganizationLifecycleSnapshot['lifecycleStatus'],
): OrganizationLifecycleSnapshot => ({
  organizationId: 'org_123',
  lifecycleStatus,
  planType: 'paid',
  provisioningStatus: 'completed',
})

test('allows all routes for workspace_active', () => {
  const decision = evaluateApiLifecycleGate('/api/agent/org_123', {
    ...buildSnapshot('workspace_active'),
  })
  assert.equal(decision.allowed, true)
})

test('redirects onboarding_incomplete users to onboarding', () => {
  const decision = evaluateApiLifecycleGate('/api/agent/org_123', {
    ...buildSnapshot('onboarding_incomplete'),
    provisioningStatus: 'pending',
  })

  assert.equal(decision.allowed, false)
  assert.equal(decision.requiredPath, '/onboarding')
})

test('allows onboarding endpoint when onboarding is incomplete', () => {
  const decision = evaluateApiLifecycleGate('/api/organization/onboarding', {
    ...buildSnapshot('onboarding_incomplete'),
    provisioningStatus: 'pending',
  })
  assert.equal(decision.allowed, true)
})

test('routes demo_approved users to provisioning status flow', () => {
  const decision = evaluateApiLifecycleGate('/api/agent/org_123', {
    ...buildSnapshot('demo_approved'),
  })

  assert.equal(decision.allowed, false)
  assert.equal(decision.requiredPath, '/dashboard/provisioning')
})

test('allows provisioning status APIs when provisioning is pending', () => {
  const decision = evaluateApiLifecycleGate('/api/provisioning/status', {
    ...buildSnapshot('provisioning_pending'),
    provisioningStatus: 'running',
  })

  assert.equal(decision.allowed, true)
})
