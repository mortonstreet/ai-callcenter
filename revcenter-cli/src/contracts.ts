import { z } from 'zod'

const nonEmptyString = z.string().trim().min(1)

export const cliModeSchema = z.enum(['embedded', 'api'])
export type CliMode = z.infer<typeof cliModeSchema>

export const WIZARD_FORBIDDEN_FIELD_KEYS = new Set([
  'systemPrompt',
  'system_prompt',
  'llmModel',
  'llm',
  'temperature',
  'maxTokens',
  'max_tokens',
  'workflow',
  'workflowConfig',
  'analysis',
  'analysisSchema',
  'security',
  'tools',
  'toolPolicy',
  'advanced',
  'knowledgeBase',
  'knowledge_base',
  'evaluationCriteria',
  'dataCollection',
  'platformSettings',
  'conversationConfig',
])

export const wizardGreetingModeSchema = z.enum(['generated', 'custom'])

export const wizardVoiceSelectionSchema = z.object({
  voiceId: nonEmptyString.optional(),
})

export const wizardGreetingSchema = z
  .object({
    mode: wizardGreetingModeSchema,
    customText: nonEmptyString.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === 'custom' && !value.customText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '`greeting.customText` is required when `greeting.mode` is `custom`.',
        path: ['customText'],
      })
    }
  })

export const wizardRoutingSchema = z.object({
  transferNumber: nonEmptyString.optional(),
  businessTimezone: nonEmptyString.optional(),
  languages: z.array(nonEmptyString).optional(),
})

export const wizardInputV2Schema = z
  .object({
    agentName: nonEmptyString,
    industry: nonEmptyString,
    useCase: nonEmptyString,
    services: z.array(nonEmptyString).min(1),
    discoveryQuestions: z.array(nonEmptyString).optional(),
    mainObjective: nonEmptyString,
    knowledgeSources: z.array(nonEmptyString).optional(),
    voiceSelection: wizardVoiceSelectionSchema.optional(),
    greeting: wizardGreetingSchema,
    routing: wizardRoutingSchema.optional(),
  })
  .strict()

export type WizardInputV2 = z.infer<typeof wizardInputV2Schema>

export const wizardAgentRequestSchema = z.object({
  name: nonEmptyString,
  domain: nonEmptyString.optional(),
  industry: nonEmptyString,
  useCase: nonEmptyString,
  services: z.array(nonEmptyString).min(1),
  discoveryQuestions: z.array(nonEmptyString).optional(),
  mainObjective: nonEmptyString.optional(),
  knowledgeSources: z.array(nonEmptyString).optional(),
  voiceSelection: wizardVoiceSelectionSchema.optional(),
  greeting: wizardGreetingSchema.optional(),
  routing: wizardRoutingSchema.optional(),
  agentName: nonEmptyString,
})

export type WizardAgentRequest = z.infer<typeof wizardAgentRequestSchema>

export const wizardRequestSummarySchema = z.object({
  organizationName: nonEmptyString,
  agentName: nonEmptyString,
  industry: nonEmptyString,
  useCase: nonEmptyString,
  serviceCount: z.number().int().nonnegative(),
  knowledgeSourceCount: z.number().int().nonnegative(),
  hasCustomGreeting: z.boolean(),
  voiceId: z.string().nullable(),
})

export type WizardRequestSummary = z.infer<typeof wizardRequestSummarySchema>

export const wizardRenderOptionsSchema = z.object({
  testMode: z.boolean().optional(),
})

export const wizardRenderRequestSchema = z.object({
  request: wizardAgentRequestSchema,
  options: wizardRenderOptionsSchema.optional(),
})

export const wizardRenderResponseSchema = z.object({
  normalizedRequest: wizardAgentRequestSchema,
  summary: wizardRequestSummarySchema,
  resolvedProfile: z.object({
    profileKey: z.string().nullable(),
    profileVersion: z.string().nullable(),
    selectedVoiceId: z.string().nullable(),
    greetingMode: wizardGreetingModeSchema,
  }),
  promptPreview: z.object({
    compiledPromptSummary: z.string(),
    knowledgeSourceCount: z.number().int().nonnegative(),
  }),
  warnings: z.array(z.string()),
})

export type WizardRenderRequest = z.infer<typeof wizardRenderRequestSchema>
export type WizardRenderResponse = z.infer<typeof wizardRenderResponseSchema>

export const wizardSubmitOptionsSchema = z.object({
  testMode: z.boolean().optional(),
  requireProvider: z.boolean().optional(),
  waitForTerminal: z.boolean().optional(),
})

export type WizardSubmitOptions = z.infer<typeof wizardSubmitOptionsSchema>

export const wizardSubmitRequestSchema = z.object({
  idempotencyKey: nonEmptyString.optional(),
  correlationId: nonEmptyString.optional(),
  request: wizardAgentRequestSchema,
  options: wizardSubmitOptionsSchema.optional(),
})

export const wizardSubmitResponseSchema = z.object({
  jobId: nonEmptyString,
  agentId: nonEmptyString,
  status: nonEmptyString,
  correlationId: nonEmptyString,
  reusedExisting: z.boolean(),
})

export type WizardSubmitRequest = z.infer<typeof wizardSubmitRequestSchema>
export type WizardSubmitResponse = z.infer<typeof wizardSubmitResponseSchema>

export const wizardProvisioningStepSchema = z.object({
  stepId: nonEmptyString,
  stepOrder: z.number().int().nonnegative(),
  status: nonEmptyString,
  attempts: z.number().int().nonnegative(),
  lastErrorCode: z.string().nullable().optional(),
  lastErrorMessage: z.string().nullable().optional(),
})

export type WizardProvisioningStep = z.infer<typeof wizardProvisioningStepSchema>

export const wizardStatusResponseSchema = z.object({
  jobId: nonEmptyString,
  status: nonEmptyString,
  correlationId: z.string().nullable(),
  organization: z.object({
    id: z.string().nullable(),
    name: z.string().nullable(),
  }),
  agent: z.object({
    agentId: nonEmptyString,
    name: z.string().nullable(),
    provider: z.string().nullable(),
    providerExternalId: z.string().nullable(),
    readinessStatus: z.string().nullable(),
  }),
  steps: z.array(wizardProvisioningStepSchema),
  lastErrorCode: z.string().nullable(),
  lastErrorMessage: z.string().nullable(),
})

export type WizardStatusResponse = z.infer<typeof wizardStatusResponseSchema>

export const WIZARD_API_ENDPOINTS = {
  render: '/v1/wizard/agents/render',
  submit: '/v1/wizard/agents',
  status: (jobId: string) =>
    `/v1/provisioning/jobs/${encodeURIComponent(jobId)}`,
} as const
