'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const strict_1 = require('node:assert/strict')
const node_test_1 = require('node:test')
const zod_1 = require('zod')
const src_1 = require('@shared/types/src')
;(0, node_test_1.default)(
  'accepts canonical wizard_input_v2 payload for create/start',
  () => {
    const parsed = src_1.CreateElevenLabsAgentSchema.parse({
      organizationId: 'org_123',
      wizard_input_v2: {
        agentName: 'Service Desk',
        industry: 'hvac',
        useCase: 'customer_support',
        services: ['ac_repair'],
        mainObjective: 'Book qualified appointments',
        greeting: {
          mode: 'generated',
        },
      },
    })
    strict_1.default.equal(parsed.organizationId, 'org_123')
    strict_1.default.equal(parsed.wizard_input_v2?.agentName, 'Service Desk')
  },
)
;(0, node_test_1.default)('rejects forbidden wizard create fields', () => {
  strict_1.default.throws(
    () =>
      src_1.CreateElevenLabsAgentSchema.parse({
        organizationId: 'org_123',
        name: 'Service Desk',
        industry: 'hvac',
        useCase: 'customer_support',
        services: ['ac_repair'],
        mainGoal: 'Book qualified appointments',
        systemPrompt: 'forbidden',
      }),
    (error) =>
      error instanceof zod_1.ZodError &&
      error.issues.some((issue) => issue.path.join('.') === 'systemPrompt'),
  )
})
;(0, node_test_1.default)(
  'requires greeting.customText when greeting.mode=custom',
  () => {
    strict_1.default.throws(
      () =>
        src_1.WizardInputV2Schema.parse({
          agentName: 'Service Desk',
          industry: 'hvac',
          useCase: 'customer_support',
          services: ['ac_repair'],
          mainObjective: 'Book qualified appointments',
          greeting: {
            mode: 'custom',
          },
        }),
      /customText/i,
    )
  },
)
;(0, node_test_1.default)('rejects legacy create payload alias fields', () => {
  strict_1.default.throws(
    () =>
      src_1.CreateElevenLabsAgentSchema.parse({
        organizationId: 'org_123',
        name: 'Legacy Agent',
        industry: 'hvac',
        useCase: 'customer_support',
        services: ['ac_repair'],
        mainGoal: 'Book qualified appointments',
      }),
    (error) =>
      error instanceof zod_1.ZodError &&
      error.issues.some((issue) => issue.path.join('.') === 'wizard_input_v2'),
  )
})
;(0, node_test_1.default)(
  'exposes canonical provisioning enums and contract request schemas',
  () => {
    strict_1.default.deepEqual(src_1.AgentProvisioningJobStatusSchema.options, [
      'queued',
      'running',
      'retrying',
      'failed',
      'completed',
      'blocked_manual',
    ])
    strict_1.default.deepEqual(src_1.AgentProvisioningStepIdSchema.options, [
      'validate_request',
      'compile_intent_profile',
      'compile_prompt',
      'create_or_update_agent',
      'apply_core_tabs_profile',
      'ingest_knowledge_sources',
      'attach_webhooks_and_mcp',
      'register_and_run_smoke_tests',
      'persist_versions_and_sync',
    ])
    const statusRequest = src_1.GetAgentProvisioningJobStatusSchema.parse({
      organizationId: 'org_123',
      jobId: 'job_123',
    })
    const retryRequest = src_1.RetryAgentProvisioningJobSchema.parse({
      organizationId: 'org_123',
      jobId: 'job_123',
      idempotencyKey: 'retry-key-1',
    })
    strict_1.default.equal(statusRequest.jobId, 'job_123')
    strict_1.default.equal(retryRequest.idempotencyKey, 'retry-key-1')
  },
)
