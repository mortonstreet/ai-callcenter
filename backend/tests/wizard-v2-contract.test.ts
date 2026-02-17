import assert from 'node:assert/strict'
import test from 'node:test'
import { ZodError } from 'zod'
import {
  AgentProvisioningJobStatusSchema,
  AgentProvisioningStepIdSchema,
  CreateElevenLabsAgentSchema,
  GetAgentProvisioningJobStatusSchema,
  RetryAgentProvisioningJobSchema,
  WizardInputV2Schema,
} from '@shared/types/src'

test('accepts canonical wizard_input_v2 payload for create/start', () => {
  const parsed = CreateElevenLabsAgentSchema.parse({
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

  assert.equal(parsed.organizationId, 'org_123')
  assert.equal(parsed.wizard_input_v2?.agentName, 'Service Desk')
})

test('rejects forbidden wizard create fields', () => {
  assert.throws(
    () =>
      CreateElevenLabsAgentSchema.parse({
        organizationId: 'org_123',
        name: 'Service Desk',
        industry: 'hvac',
        useCase: 'customer_support',
        services: ['ac_repair'],
        mainGoal: 'Book qualified appointments',
        systemPrompt: 'forbidden',
      }),
    (error) =>
      error instanceof ZodError &&
      error.issues.some((issue) => issue.path.join('.') === 'systemPrompt'),
  )
})

test('requires greeting.customText when greeting.mode=custom', () => {
  assert.throws(
    () =>
      WizardInputV2Schema.parse({
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
})

test('rejects legacy create payload alias fields', () => {
  assert.throws(
    () =>
      CreateElevenLabsAgentSchema.parse({
        organizationId: 'org_123',
        name: 'Legacy Agent',
        industry: 'hvac',
        useCase: 'customer_support',
        services: ['ac_repair'],
        mainGoal: 'Book qualified appointments',
      }),
    (error) =>
      error instanceof ZodError &&
      error.issues.some((issue) => issue.path.join('.') === 'wizard_input_v2'),
  )
})

test('exposes canonical provisioning enums and contract request schemas', () => {
  assert.deepEqual(AgentProvisioningJobStatusSchema.options, [
    'queued',
    'running',
    'retrying',
    'failed',
    'completed',
    'blocked_manual',
  ])

  assert.deepEqual(AgentProvisioningStepIdSchema.options, [
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

  const statusRequest = GetAgentProvisioningJobStatusSchema.parse({
    organizationId: 'org_123',
    jobId: 'job_123',
  })

  const retryRequest = RetryAgentProvisioningJobSchema.parse({
    organizationId: 'org_123',
    jobId: 'job_123',
    idempotencyKey: 'retry-key-1',
  })

  assert.equal(statusRequest.jobId, 'job_123')
  assert.equal(retryRequest.idempotencyKey, 'retry-key-1')
})
