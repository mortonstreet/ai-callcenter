'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const strict_1 = require('node:assert/strict')
const node_test_1 = require('node:test')
const provisioning_status_service_1 = require('../src/services/provisioning-status.service')
;(0, node_test_1.default)(
  'rollout cohort defaults to demo for demo plan org metadata',
  () => {
    const cohort = (0,
    provisioning_status_service_1.resolveWizardRolloutCohort)({
      slug: 'acme-demo',
      metadata: {
        planType: 'demo',
      },
    })
    strict_1.default.equal(cohort, 'demo')
  },
)
;(0, node_test_1.default)(
  'rollout cohort defaults to internal for internal slugs',
  () => {
    const cohort = (0,
    provisioning_status_service_1.resolveWizardRolloutCohort)({
      slug: 'internal-ops-lab',
      metadata: {
        planType: 'paid',
      },
    })
    strict_1.default.equal(cohort, 'internal')
  },
)
;(0, node_test_1.default)(
  'general cohort defaults feature flag to disabled',
  () => {
    const rollout = (0,
    provisioning_status_service_1.resolveWizardRolloutForOrganization)({
      organization: {
        slug: 'customer-prod-org',
        metadata: JSON.stringify({
          planType: 'paid',
        }),
      },
    })
    strict_1.default.equal(rollout.cohort, 'general')
    strict_1.default.equal(rollout.featureEnabled, false)
    strict_1.default.equal(rollout.canary, false)
  },
)
;(0, node_test_1.default)(
  'explicit rollout overrides canary defaults and supports pause',
  () => {
    const rollout = (0,
    provisioning_status_service_1.resolveWizardRolloutForOrganization)({
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
    strict_1.default.equal(rollout.cohort, 'demo')
    strict_1.default.equal(rollout.featureEnabled, false)
    strict_1.default.equal(rollout.paused, true)
    strict_1.default.equal(rollout.pausedReason, 'rollback under investigation')
  },
)
