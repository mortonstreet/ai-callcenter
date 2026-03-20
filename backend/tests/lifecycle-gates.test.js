'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const strict_1 = require('node:assert/strict')
const node_test_1 = require('node:test')
const lifecycle_gates_core_1 = require('../src/lib/lifecycle-gates.core')
;(0, node_test_1.default)(
  'paid organization with active subscription resolves workspace access',
  () => {
    const snapshot = (0,
    lifecycle_gates_core_1.buildOrganizationLifecycleSnapshotFromMetadata)({
      organizationId: 'org_paid_active',
      metadata: {
        planType: 'paid',
        provisioningStatus: 'completed',
        lifecycleStatus: 'payment_required',
        subscriptionStatus: 'active',
      },
    })
    strict_1.default.equal(snapshot.lifecycleStatus, 'workspace_active')
    const decision = (0, lifecycle_gates_core_1.evaluateApiLifecycleGate)(
      '/api/agent/org_paid_active',
      snapshot,
    )
    strict_1.default.equal(decision.allowed, true)
  },
)
;(0, node_test_1.default)(
  'paid organization with past_due subscription is routed to billing',
  () => {
    const snapshot = (0,
    lifecycle_gates_core_1.buildOrganizationLifecycleSnapshotFromMetadata)({
      organizationId: 'org_paid_due',
      metadata: {
        planType: 'paid',
        provisioningStatus: 'completed',
        subscriptionStatus: 'past_due',
      },
    })
    strict_1.default.equal(snapshot.lifecycleStatus, 'payment_required')
    const blocked = (0, lifecycle_gates_core_1.evaluateApiLifecycleGate)(
      '/api/agent/org_paid_due',
      snapshot,
    )
    strict_1.default.equal(blocked.allowed, false)
    strict_1.default.equal(blocked.requiredPath, '/dashboard/billing')
    const allowedBilling = (0, lifecycle_gates_core_1.evaluateApiLifecycleGate)(
      '/api/billing/summary',
      snapshot,
    )
    strict_1.default.equal(allowedBilling.allowed, true)
  },
)
;(0, node_test_1.default)(
  'paid organization with canceled subscription becomes suspended',
  () => {
    const snapshot = (0,
    lifecycle_gates_core_1.buildOrganizationLifecycleSnapshotFromMetadata)({
      organizationId: 'org_paid_canceled',
      metadata: {
        planType: 'paid',
        provisioningStatus: 'completed',
        subscriptionStatus: 'canceled',
      },
    })
    strict_1.default.equal(snapshot.lifecycleStatus, 'suspended')
  },
)
;(0, node_test_1.default)(
  'demo organization without approved policy cannot bypass billing',
  () => {
    const snapshot = (0,
    lifecycle_gates_core_1.buildOrganizationLifecycleSnapshotFromMetadata)({
      organizationId: 'org_demo_unapproved',
      metadata: {
        planType: 'demo',
        lifecycleStatus: 'demo_approved',
        provisioningStatus: 'pending',
      },
    })
    strict_1.default.equal(snapshot.lifecycleStatus, 'payment_required')
  },
)
;(0, node_test_1.default)(
  'demo organization with approved policy keeps demo_approved gate',
  () => {
    const snapshot = (0,
    lifecycle_gates_core_1.buildOrganizationLifecycleSnapshotFromMetadata)({
      organizationId: 'org_demo_approved',
      metadata: {
        planType: 'demo',
        lifecycleStatus: 'payment_required',
        provisioningStatus: 'pending',
        demoPolicy: {
          approvedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    })
    strict_1.default.equal(snapshot.lifecycleStatus, 'demo_approved')
  },
)
