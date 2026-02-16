import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildDeadLetterPayload,
  extractDeadLetterMetadata,
  stripDeadLetterEnvelope,
} from '@/queues/dead-letter'

test('builds and extracts dead-letter metadata envelope', () => {
  const payload = buildDeadLetterPayload({
    queueName: 'integration_sync',
    originalJobName: 'agent-provision-retry',
    payload: {
      organizationId: 'org_123',
      correlationId: 'corr_123',
      idempotencyKey: 'idemp_123',
      agentId: 'agent_123',
    },
    failedJobId: 'job_123',
    failedAt: '2026-02-16T00:00:00.000Z',
    errorMessage: 'provider timeout',
    attemptsMade: 6,
    maxAttempts: 6,
    correlationId: 'corr_123',
  })

  const metadata = extractDeadLetterMetadata(payload)
  assert.ok(metadata)
  assert.equal(metadata?.queueName, 'integration_sync')
  assert.equal(metadata?.originalJobName, 'agent-provision-retry')
  assert.equal(metadata?.attemptsMade, 6)
  assert.equal(metadata?.maxAttempts, 6)
  assert.equal(metadata?.correlationId, 'corr_123')
})

test('strips dead-letter envelope before replay', () => {
  const payload = buildDeadLetterPayload({
    queueName: 'integration_sync',
    originalJobName: 'agent-update-retry',
    payload: {
      organizationId: 'org_456',
      correlationId: 'corr_456',
      updates: { status: 'active' },
    },
    failedJobId: 'job_456',
    failedAt: '2026-02-16T00:00:00.000Z',
    errorMessage: 'upstream error',
    attemptsMade: 5,
    maxAttempts: 5,
    correlationId: 'corr_456',
  })

  const replayPayload = stripDeadLetterEnvelope(payload) as Record<
    string,
    unknown
  >
  assert.equal(replayPayload.organizationId, 'org_456')
  assert.equal(replayPayload.correlationId, 'corr_456')
  assert.equal('failedJobId' in replayPayload, false)
  assert.equal('failedAt' in replayPayload, false)
  assert.equal('errorMessage' in replayPayload, false)
  assert.equal('_deadLetter' in replayPayload, false)
})
