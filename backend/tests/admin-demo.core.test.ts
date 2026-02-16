import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyDemoApproval,
  applyDemoConversion,
  applyDemoExtension,
  applyDemoOwnerHandoff,
  applyDemoSuspension,
  buildCreateDemoMetadata,
  buildDemoTenantSummary,
} from '../src/services/admin-demo.core'

test('builds demo metadata in pending approval state', () => {
  const createdAt = new Date('2026-02-15T12:00:00.000Z')
  const metadata = buildCreateDemoMetadata({
    now: createdAt,
    ownerEmail: 'owner@example.com',
    ownerName: 'Demo Owner',
    actorUserId: 'admin_1',
    expiresAt: '2026-03-01T12:00:00.000Z',
    usageLimits: {
      maxAgents: 2,
      maxSeats: 5,
    },
  })

  const summary = buildDemoTenantSummary({
    organizationId: 'org_demo_1',
    name: 'Demo Org',
    slug: 'demo-org',
    createdAt,
    metadata,
    now: createdAt,
  })

  assert.equal(summary.status, 'pending_approval')
  assert.equal(summary.lifecycleStatus, 'payment_required')
  assert.equal(summary.ownerEmail, 'owner@example.com')
  assert.equal(summary.ownerName, 'Demo Owner')
  assert.equal(summary.expiresAt, '2026-03-01T12:00:00.000Z')
})

test('supports approve extend and suspend transitions for demo tenants', () => {
  const base = buildCreateDemoMetadata({
    now: new Date('2026-02-15T12:00:00.000Z'),
    ownerEmail: 'owner@example.com',
    actorUserId: 'admin_1',
  })

  const approved = applyDemoApproval(base, {
    now: new Date('2026-02-16T10:00:00.000Z'),
    actorUserId: 'admin_2',
    expiresAt: '2026-03-01T10:00:00.000Z',
    approvalNotes: 'Approved for customer success sandbox',
  })

  const approvedSummary = buildDemoTenantSummary({
    organizationId: 'org_demo_2',
    name: 'Demo Org 2',
    slug: 'demo-org-2',
    createdAt: '2026-02-15T12:00:00.000Z',
    metadata: approved,
    now: new Date('2026-02-16T10:00:00.000Z'),
  })

  assert.equal(approvedSummary.status, 'approved')
  assert.equal(approvedSummary.lifecycleStatus, 'demo_approved')

  const extended = applyDemoExtension(approved, {
    now: new Date('2026-02-20T10:00:00.000Z'),
    actorUserId: 'admin_2',
    expiresAt: '2026-03-20T10:00:00.000Z',
    extensionReason: 'Pilot has additional training sessions',
  })

  const extendedSummary = buildDemoTenantSummary({
    organizationId: 'org_demo_2',
    name: 'Demo Org 2',
    slug: 'demo-org-2',
    createdAt: '2026-02-15T12:00:00.000Z',
    metadata: extended,
    now: new Date('2026-02-20T10:00:00.000Z'),
  })

  assert.equal(extendedSummary.status, 'approved')
  assert.equal(extendedSummary.expiresAt, '2026-03-20T10:00:00.000Z')
  assert.equal(
    extendedSummary.extensionReason,
    'Pilot has additional training sessions',
  )

  const suspended = applyDemoSuspension(extended, {
    now: new Date('2026-02-21T09:00:00.000Z'),
    actorUserId: 'admin_3',
    reason: 'Policy violation',
  })

  const suspendedSummary = buildDemoTenantSummary({
    organizationId: 'org_demo_2',
    name: 'Demo Org 2',
    slug: 'demo-org-2',
    createdAt: '2026-02-15T12:00:00.000Z',
    metadata: suspended,
    now: new Date('2026-02-21T09:00:00.000Z'),
  })

  assert.equal(suspendedSummary.status, 'suspended')
  assert.equal(suspendedSummary.lifecycleStatus, 'suspended')
})

test('supports owner handoff and conversion to paid lifecycle', () => {
  const base = buildCreateDemoMetadata({
    now: new Date('2026-02-15T12:00:00.000Z'),
    ownerEmail: 'original-owner@example.com',
    actorUserId: 'admin_1',
  })

  const approved = applyDemoApproval(base, {
    now: new Date('2026-02-16T10:00:00.000Z'),
    actorUserId: 'admin_1',
    expiresAt: '2026-02-28T10:00:00.000Z',
  })

  const handedOff = applyDemoOwnerHandoff(approved, {
    now: new Date('2026-02-18T10:00:00.000Z'),
    actorUserId: 'admin_2',
    ownerEmail: 'new-owner@example.com',
    ownerUserId: 'user_2',
    ownerName: 'New Owner',
  })

  const handoffSummary = buildDemoTenantSummary({
    organizationId: 'org_demo_3',
    name: 'Demo Org 3',
    slug: 'demo-org-3',
    createdAt: '2026-02-15T12:00:00.000Z',
    metadata: handedOff,
    now: new Date('2026-02-18T10:00:00.000Z'),
  })

  assert.equal(handoffSummary.ownerEmail, 'new-owner@example.com')
  assert.equal(handoffSummary.ownerName, 'New Owner')

  const converted = applyDemoConversion(handedOff, {
    now: new Date('2026-02-19T10:00:00.000Z'),
    actorUserId: 'admin_3',
    reason: 'Owner accepted paid migration',
  })

  const convertedSummary = buildDemoTenantSummary({
    organizationId: 'org_demo_3',
    name: 'Demo Org 3',
    slug: 'demo-org-3',
    createdAt: '2026-02-15T12:00:00.000Z',
    metadata: converted,
    now: new Date('2026-02-19T10:00:00.000Z'),
  })

  assert.equal(convertedSummary.status, 'converted')
  assert.equal(convertedSummary.lifecycleStatus, 'payment_required')
})
