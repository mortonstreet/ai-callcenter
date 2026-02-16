import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AdminApproveDemoTenantRequestSchema,
  AdminCreateDemoTenantRequestSchema,
  AdminExtendDemoTenantRequestSchema,
  AdminSuspendDemoTenantRequestSchema,
} from '@shared/types/src/requests/admin'

test('validates create demo tenant API payload', () => {
  const parsed = AdminCreateDemoTenantRequestSchema.parse({
    name: 'ACME Demo',
    ownerEmail: 'owner@example.com',
    ownerName: 'Owner',
    expiresAt: '2026-03-01T00:00:00.000Z',
    usageLimits: {
      maxAgents: 3,
      maxSeats: 10,
    },
    onboarding: {
      industry: 'hvac',
      services: ['Service A'],
      useCase: 'customer_support',
      agentName: 'Demo Agent',
    },
    approvalNotes: 'Requested by customer success',
  })

  assert.equal(parsed.ownerEmail, 'owner@example.com')
  assert.equal(parsed.usageLimits?.maxAgents, 3)
})

test('validates approve demo tenant API payload', () => {
  const parsed = AdminApproveDemoTenantRequestSchema.parse({
    organizationId: 'org_123',
    expiresAt: '2026-03-05T00:00:00.000Z',
    usageLimits: {
      maxMonthlyCalls: 500,
    },
    approvalNotes: 'Approved',
  })

  assert.equal(parsed.organizationId, 'org_123')
  assert.equal(parsed.usageLimits?.maxMonthlyCalls, 500)
})

test('validates extend and suspend API payloads', () => {
  const extendParsed = AdminExtendDemoTenantRequestSchema.parse({
    organizationId: 'org_456',
    expiresAt: '2026-04-01T00:00:00.000Z',
    extensionReason: 'Pilot extension',
  })

  const suspendParsed = AdminSuspendDemoTenantRequestSchema.parse({
    organizationId: 'org_456',
    reason: 'Policy violation',
  })

  assert.equal(extendParsed.organizationId, 'org_456')
  assert.equal(suspendParsed.reason, 'Policy violation')
})
