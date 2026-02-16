import assert from 'node:assert/strict'
import test from 'node:test'
import type { DBAdminAuditLog } from '@shared/db/src'
import {
  emitTransitionAuditEvent,
  listTransitionAuditEvents,
  resetTransitionAuditRepositoryForTests,
  setTransitionAuditRepositoryForTests,
} from '@/services/lifecycle-transition-audit.service'

const createInMemoryRepository = () => {
  const records: DBAdminAuditLog[] = []

  return {
    records,
    repository: {
      create: async (data: any) => {
        const row: DBAdminAuditLog = {
          id: `audit_${records.length + 1}`,
          organizationId: data.organizationId ?? null,
          actorUserId: data.actorUserId ?? null,
          action: data.action,
          resourceType: data.resourceType,
          resourceId: data.resourceId ?? null,
          before: data.before ?? null,
          after: data.after ?? null,
          ipAddress: data.ipAddress ?? null,
          userAgent: data.userAgent ?? null,
          createdAt: new Date(),
        }

        records.unshift(row)
        return row
      },
      list: async (organizationId?: string, limit = 100) => {
        const scoped = organizationId
          ? records.filter((item) => item.organizationId === organizationId)
          : records
        return scoped.slice(0, limit)
      },
    },
  }
}

test.afterEach(() => {
  resetTransitionAuditRepositoryForTests()
})

test('emits transition audit events with organization and correlation IDs', async () => {
  const { repository } = createInMemoryRepository()
  setTransitionAuditRepositoryForTests(repository)

  const event = await emitTransitionAuditEvent({
    organizationId: 'org_1',
    domain: 'provisioning',
    fromState: 'running',
    toState: 'completed',
    source: 'worker',
    correlationId: 'corr_1',
    actorUserId: 'user_1',
    reason: 'retry_recovered',
    metadata: {
      queueName: 'integration_sync',
    },
  })

  assert.ok(event)
  assert.equal(event?.organizationId, 'org_1')
  assert.equal(event?.domain, 'provisioning')
  assert.equal(event?.correlationId, 'corr_1')
  assert.equal(event?.fromState, 'running')
  assert.equal(event?.toState, 'completed')
})

test('lists and filters transition events by domain and correlation', async () => {
  const { repository } = createInMemoryRepository()
  setTransitionAuditRepositoryForTests(repository)

  await emitTransitionAuditEvent({
    organizationId: 'org_2',
    domain: 'billing',
    fromState: 'onboarding_completed',
    toState: 'payment_required',
    source: 'api',
    correlationId: 'corr_billing',
  })
  await emitTransitionAuditEvent({
    organizationId: 'org_2',
    domain: 'provisioning',
    fromState: 'retrying',
    toState: 'failed',
    source: 'worker',
    correlationId: 'corr_provisioning',
  })

  const billing = await listTransitionAuditEvents({
    organizationId: 'org_2',
    domain: 'billing',
    limit: 20,
  })
  const provisioning = await listTransitionAuditEvents({
    organizationId: 'org_2',
    domain: 'provisioning',
    correlationId: 'corr_provisioning',
    limit: 20,
  })

  assert.equal(billing.length, 1)
  assert.equal(billing[0]?.domain, 'billing')
  assert.equal(provisioning.length, 1)
  assert.equal(provisioning[0]?.correlationId, 'corr_provisioning')
})
