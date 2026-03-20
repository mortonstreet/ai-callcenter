'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const strict_1 = require('node:assert/strict')
const node_test_1 = require('node:test')
const agent_core_tab_autoprovisioning_1 = require('../src/services/agent-core-tab-autoprovisioning')
;(0, node_test_1.default)(
  'validates workflow routes and compiles core-tab defaults',
  () => {
    const validation = (0,
    agent_core_tab_autoprovisioning_1.validateWorkflowDefinition)()
    strict_1.default.equal(validation.requiredRoutesPresent, true)
    strict_1.default.deepEqual(validation.missingIntentRoutes, [])
    const plan = (0,
    agent_core_tab_autoprovisioning_1.buildCoreTabProvisioningPlan)({
      website: 'https://example.com/',
      transferNumber: '+15555550199',
    })
    strict_1.default.equal(plan.profileVersion, 'v1')
    strict_1.default.equal(plan.workflowVersion, 'v1')
    strict_1.default.equal(plan.updateParams.llmModel, 'gpt-4o')
    strict_1.default.equal(plan.updateParams.temperature, 0.7)
    strict_1.default.equal(plan.updateParams.maxTokens, 1024)
    strict_1.default.equal(plan.updateParams.language, 'en')
    strict_1.default.equal(plan.updateParams.security.authTokenEnabled, true)
    strict_1.default.equal(plan.updateParams.callLimits.maxConcurrent, 10)
    strict_1.default.equal(
      plan.updateParams.conversation.maxDurationSeconds,
      3600,
    )
    strict_1.default.equal(plan.tests.blockActivationOnFailures, true)
    strict_1.default.ok(
      plan.updateParams.builtInTools.includes('transfer_to_number'),
    )
    strict_1.default.ok(plan.updateParams.toolIds.includes('lookup_customer'))
    strict_1.default.ok(plan.updateParams.toolIds.includes('book_appointment'))
    strict_1.default.ok(plan.updateParams.toolIds.includes('create_task'))
  },
)
;(0, node_test_1.default)(
  'normalizes, dedupes, and filters knowledge sources',
  () => {
    const plan = (0,
    agent_core_tab_autoprovisioning_1.buildCoreTabProvisioningPlan)({
      website: 'https://example.com/',
      knowledgeSources: [
        'https://example.com/docs/',
        'https://example.com/privacy',
        'https://example.com',
        'not-a-url',
      ],
    })
    strict_1.default.deepEqual(plan.knowledgeManifest.ingestibleSources, [
      'https://example.com/',
      'https://example.com/docs',
    ])
    const skippedReasons = plan.knowledgeManifest.entries
      .filter((entry) => entry.status === 'skipped')
      .map((entry) => entry.reason)
    strict_1.default.ok(skippedReasons.includes('excluded_path'))
    strict_1.default.ok(skippedReasons.includes('duplicate'))
    strict_1.default.ok(skippedReasons.includes('invalid_url'))
  },
)
;(0, node_test_1.default)(
  'creates provisioning evidence scaffold with no steps recorded yet',
  () => {
    const plan = (0,
    agent_core_tab_autoprovisioning_1.buildCoreTabProvisioningPlan)({
      website: 'https://example.com',
    })
    const evidence = (0,
    agent_core_tab_autoprovisioning_1.createCoreTabProvisioningEvidence)(
      plan,
      new Date('2026-02-17T10:00:00.000Z'),
    )
    strict_1.default.equal(evidence.generatedAt, '2026-02-17T10:00:00.000Z')
    strict_1.default.equal(evidence.steps.length, 0)
    strict_1.default.equal(evidence.errors.length, 0)
    strict_1.default.equal(
      evidence.mcpDefaults.endpoint,
      'https://api.revcenter.ai/mcp/sse',
    )
  },
)
