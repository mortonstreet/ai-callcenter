import assert from 'node:assert/strict'
import test from 'node:test'
import {
  resolveWizardRolloutCohort,
  resolveWizardRolloutForOrganization,
} from '../src/services/provisioning-status.service'

test('rollout cohort defaults to demo for demo plan org metadata', () => {
  const cohort = resolveWizardRolloutCohort({
    slug: 'acme-demo',
    metadata: {
      planType: 'demo',
    },
  })

  assert.equal(cohort, 'demo')
})

test('rollout cohort defaults to internal for internal slugs', () => {
  const cohort = resolveWizardRolloutCohort({
    slug: 'internal-ops-lab',
    metadata: {
      planType: 'paid',
    },
  })

  assert.equal(cohort, 'internal')
})

test('general cohort defaults feature flag to disabled', () => {
  const rollout = resolveWizardRolloutForOrganization({
    organization: {
      slug: 'customer-prod-org',
      metadata: JSON.stringify({
        planType: 'paid',
      }),
    },
  })

  assert.equal(rollout.cohort, 'general')
  assert.equal(rollout.featureEnabled, false)
  assert.equal(rollout.canary, false)
})

test('explicit rollout overrides canary defaults and supports pause', () => {
  const rollout = resolveWizardRolloutForOrganization({
    organization: {
      slug: 'demo-sandbox',
      metadata: JSON.stringify({
        planType: 'demo',
      }),
    },
    rollout: {
      featureEnabled: false,
      paused: true,
      pausedReason: 'rollback under investigation',
    },
  })

  assert.equal(rollout.cohort, 'demo')
  assert.equal(rollout.featureEnabled, false)
  assert.equal(rollout.paused, true)
  assert.equal(rollout.pausedReason, 'rollback under investigation')
})
