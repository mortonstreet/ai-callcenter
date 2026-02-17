import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildOrganizationLifecycleSnapshotFromMetadata,
  evaluateApiLifecycleGate,
} from '../src/lib/lifecycle-gates.core'

test('paid organization with active subscription resolves workspace access', () => {
  const snapshot = buildOrganizationLifecycleSnapshotFromMetadata({
    organizationId: 'org_paid_active',
    metadata: {
      planType: 'paid',
      provisioningStatus: 'completed',
      lifecycleStatus: 'payment_required',
      subscriptionStatus: 'active',
    },
  })

  assert.equal(snapshot.lifecycleStatus, 'workspace_active')
  const decision = evaluateApiLifecycleGate(
    '/api/agent/org_paid_active',
    snapshot,
  )
  assert.equal(decision.allowed, true)
})

test('paid organization with past_due subscription is routed to billing', () => {
  const snapshot = buildOrganizationLifecycleSnapshotFromMetadata({
    organizationId: 'org_paid_due',
    metadata: {
      planType: 'paid',
      provisioningStatus: 'completed',
      subscriptionStatus: 'past_due',
    },
  })

  assert.equal(snapshot.lifecycleStatus, 'payment_required')
  const blocked = evaluateApiLifecycleGate('/api/agent/org_paid_due', snapshot)
  assert.equal(blocked.allowed, false)
  assert.equal(blocked.requiredPath, '/dashboard/billing')

  const allowedBilling = evaluateApiLifecycleGate(
    '/api/billing/summary',
    snapshot,
  )
  assert.equal(allowedBilling.allowed, true)
})

test('paid organization with canceled subscription becomes suspended', () => {
  const snapshot = buildOrganizationLifecycleSnapshotFromMetadata({
    organizationId: 'org_paid_canceled',
    metadata: {
      planType: 'paid',
      provisioningStatus: 'completed',
      subscriptionStatus: 'canceled',
    },
  })

  assert.equal(snapshot.lifecycleStatus, 'suspended')
})

test('demo organization without approved policy cannot bypass billing', () => {
  const snapshot = buildOrganizationLifecycleSnapshotFromMetadata({
    organizationId: 'org_demo_unapproved',
    metadata: {
      planType: 'demo',
      lifecycleStatus: 'demo_approved',
      provisioningStatus: 'pending',
    },
  })

  assert.equal(snapshot.lifecycleStatus, 'payment_required')
})

test('demo organization with approved policy keeps demo_approved gate', () => {
  const snapshot = buildOrganizationLifecycleSnapshotFromMetadata({
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

  assert.equal(snapshot.lifecycleStatus, 'demo_approved')
})
