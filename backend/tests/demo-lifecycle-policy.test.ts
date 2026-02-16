import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyDemoApproval,
  buildCreateDemoMetadata,
  buildDemoTenantSummary,
} from '../src/services/admin-demo.core'

test('demo policy resolves approved lifecycle while within expiry window', () => {
  const createdMetadata = buildCreateDemoMetadata({
    now: new Date('2026-02-01T00:00:00.000Z'),
    ownerEmail: 'owner@example.com',
    actorUserId: 'admin_1',
  })

  const approvedMetadata = applyDemoApproval(createdMetadata, {
    now: new Date('2026-02-02T00:00:00.000Z'),
    actorUserId: 'admin_1',
    expiresAt: '2026-03-01T00:00:00.000Z',
  })

  const summary = buildDemoTenantSummary({
    organizationId: 'org_demo_active',
    name: 'Demo Active',
    slug: 'demo-active',
    createdAt: '2026-02-01T00:00:00.000Z',
    metadata: approvedMetadata,
    now: new Date('2026-02-15T00:00:00.000Z'),
  })

  assert.equal(summary.status, 'approved')
  assert.equal(summary.lifecycleStatus, 'demo_approved')
})

test('demo policy resolves expired lifecycle once expiry passes', () => {
  const createdMetadata = buildCreateDemoMetadata({
    now: new Date('2026-01-01T00:00:00.000Z'),
    ownerEmail: 'owner@example.com',
    actorUserId: 'admin_1',
  })

  const approvedMetadata = applyDemoApproval(createdMetadata, {
    now: new Date('2026-01-02T00:00:00.000Z'),
    actorUserId: 'admin_1',
    expiresAt: '2026-01-15T00:00:00.000Z',
  })

  const summary = buildDemoTenantSummary({
    organizationId: 'org_demo_expired',
    name: 'Demo Expired',
    slug: 'demo-expired',
    createdAt: '2026-01-01T00:00:00.000Z',
    metadata: approvedMetadata,
    now: new Date('2026-02-15T00:00:00.000Z'),
  })

  assert.equal(summary.status, 'expired')
  assert.equal(summary.lifecycleStatus, 'suspended')
})
