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

test('treats blank routing fields as optional instead of failing validation', async () => {
  const schemaModulePath = '../../shared/types/src/requests/agent.ts'
  const agentSchemasModule = (await import(
    schemaModulePath as string
  )) as Record<string, any>
  const agentSchemas =
    agentSchemasModule.default ||
    agentSchemasModule['module.exports'] ||
    agentSchemasModule
  const SourceCreateElevenLabsAgentSchema =
    agentSchemas.CreateElevenLabsAgentSchema

  const parsed = SourceCreateElevenLabsAgentSchema.parse({
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
      routing: {
        transferNumber: '   ',
        businessTimezone: '   ',
        languages: ['  ', 'en'],
      },
    },
  })

  assert.equal(parsed.wizard_input_v2.routing?.transferNumber, undefined)
  assert.equal(parsed.wizard_input_v2.routing?.businessTimezone, undefined)
  assert.deepEqual(parsed.wizard_input_v2.routing?.languages, ['en'])
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

test('rejects Twilio transport fields on wizard create payload', () => {
  assert.throws(
    () =>
      CreateElevenLabsAgentSchema.parse({
        organizationId: 'org_123',
        phoneNumber: '+15551234567',
        redirectNumber: '+15557654321',
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
      }),
    (error) =>
      error instanceof ZodError &&
      error.issues.some(
        (issue) =>
          issue.code === 'unrecognized_keys' &&
          Array.isArray((issue as { keys?: unknown }).keys) &&
          ((issue as { keys: string[] }).keys.includes('phoneNumber') ||
            (issue as { keys: string[] }).keys.includes('redirectNumber')),
      ),
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
