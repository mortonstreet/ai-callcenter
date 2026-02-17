import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildCoreTabProvisioningPlan,
  createCoreTabProvisioningEvidence,
  validateWorkflowDefinition,
} from '../src/services/agent-core-tab-autoprovisioning'

test('validates workflow routes and compiles core-tab defaults', () => {
  const validation = validateWorkflowDefinition()
  assert.equal(validation.requiredRoutesPresent, true)
  assert.deepEqual(validation.missingIntentRoutes, [])

  const plan = buildCoreTabProvisioningPlan({
    website: 'https://example.com/',
    transferNumber: '+15555550199',
  })

  assert.equal(plan.profileVersion, 'v1')
  assert.equal(plan.workflowVersion, 'v1')
  assert.equal(plan.updateParams.llmModel, 'gpt-4o')
  assert.equal(plan.updateParams.temperature, 0.7)
  assert.equal(plan.updateParams.maxTokens, 1024)
  assert.equal(plan.updateParams.language, 'en')
  assert.equal(plan.updateParams.security.authTokenEnabled, true)
  assert.equal(plan.updateParams.callLimits.maxConcurrent, 10)
  assert.equal(plan.updateParams.conversation.maxDurationSeconds, 3600)
  assert.equal(plan.tests.blockActivationOnFailures, true)
  assert.ok(plan.updateParams.builtInTools.includes('transfer_to_number'))
  assert.ok(plan.updateParams.toolIds.includes('lookup_customer'))
  assert.ok(plan.updateParams.toolIds.includes('book_appointment'))
  assert.ok(plan.updateParams.toolIds.includes('create_task'))
})

test('normalizes, dedupes, and filters knowledge sources', () => {
  const plan = buildCoreTabProvisioningPlan({
    website: 'https://example.com/',
    knowledgeSources: [
      'https://example.com/docs/',
      'https://example.com/privacy',
      'https://example.com',
      'not-a-url',
    ],
  })

  assert.deepEqual(plan.knowledgeManifest.ingestibleSources, [
    'https://example.com/',
    'https://example.com/docs',
  ])

  const skippedReasons = plan.knowledgeManifest.entries
    .filter((entry) => entry.status === 'skipped')
    .map((entry) => entry.reason)

  assert.ok(skippedReasons.includes('excluded_path'))
  assert.ok(skippedReasons.includes('duplicate'))
  assert.ok(skippedReasons.includes('invalid_url'))
})

test('creates provisioning evidence scaffold with no steps recorded yet', () => {
  const plan = buildCoreTabProvisioningPlan({
    website: 'https://example.com',
  })
  const evidence = createCoreTabProvisioningEvidence(
    plan,
    new Date('2026-02-17T10:00:00.000Z'),
  )

  assert.equal(evidence.generatedAt, '2026-02-17T10:00:00.000Z')
  assert.equal(evidence.steps.length, 0)
  assert.equal(evidence.errors.length, 0)
  assert.equal(
    evidence.mcpDefaults.endpoint,
    'https://api.revcenter.ai/mcp/sse',
  )
})
