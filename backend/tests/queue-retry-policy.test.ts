import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isProvisioningRetryJobName,
  listQueueRetryPolicies,
  resolveQueueRetryPolicy,
} from '@/queues/retry-policy'

test('provisioning retry jobs have explicit max-attempt policy', () => {
  const provisionPolicy = resolveQueueRetryPolicy(
    'integration_sync',
    'agent-provision-retry',
  )
  const updatePolicy = resolveQueueRetryPolicy(
    'integration_sync',
    'agent-update-retry',
  )

  assert.equal(provisionPolicy.attempts, 6)
  assert.equal(provisionPolicy.backoffDelayMs, 10_000)
  assert.equal(updatePolicy.attempts, 5)
  assert.equal(updatePolicy.backoffDelayMs, 7500)
})

test('non-critical queue jobs fall back to queue/default policy', () => {
  const integrationPolicy = resolveQueueRetryPolicy('integration_sync')
  const smsPolicy = resolveQueueRetryPolicy('campaign_sms', 'campaign-send')

  assert.equal(integrationPolicy.attempts, 4)
  assert.equal(smsPolicy.attempts, 5)
  assert.equal(smsPolicy.backoffDelayMs, 2000)
})

test('policy summary exposes critical-job map', () => {
  const summary = listQueueRetryPolicies()

  assert.equal(
    summary.criticalJobs['integration_sync:agent-provision-retry']?.attempts,
    6,
  )
  assert.equal(isProvisioningRetryJobName('agent-provision-retry'), true)
  assert.equal(isProvisioningRetryJobName('integration-sync'), false)
})
