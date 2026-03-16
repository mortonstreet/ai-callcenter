import { z } from 'zod'

const integrationProviders = [
  'jobber',
  'workiz',
  'servicetitan',
  'google_calendar',
] as const

export const IntegrationProviderSchema = z.enum(integrationProviders)
export type IntegrationProvider = z.infer<typeof IntegrationProviderSchema>

export const IntegrationConnectionStatusSchema = z.enum([
  'connected',
  'disconnected',
  'pending',
  'error',
])
export type IntegrationConnectionStatus = z.infer<
  typeof IntegrationConnectionStatusSchema
>

export const IntegrationSyncDirectionSchema = z.enum(['pull', 'push'])
export type IntegrationSyncDirection = z.infer<
  typeof IntegrationSyncDirectionSchema
>

export const IntegrationSyncStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
])
export type IntegrationSyncStatus = z.infer<typeof IntegrationSyncStatusSchema>

const IntegrationOrganizationScopeSchema = z.object({
  organizationId: z.string().optional().default(''),
})

const IntegrationProviderScopeSchema = IntegrationOrganizationScopeSchema.extend({
  provider: IntegrationProviderSchema,
})

export const GetIntegrationsRequestSchema = IntegrationOrganizationScopeSchema
export type GetIntegrationsRequest = z.infer<typeof GetIntegrationsRequestSchema>

export const GetIntegrationStatusRequestSchema = IntegrationProviderScopeSchema
export type GetIntegrationStatusRequest = z.infer<
  typeof GetIntegrationStatusRequestSchema
>

export const ConnectIntegrationRequestSchema = IntegrationProviderScopeSchema.extend(
  {
    redirectUri: z.string().url().optional(),
    state: z.string().optional(),
  },
)
export type ConnectIntegrationRequest = z.infer<
  typeof ConnectIntegrationRequestSchema
>

export const IntegrationCallbackRequestSchema = IntegrationProviderScopeSchema.extend(
  {
    code: z.string().optional(),
    state: z.string().optional(),
    error: z.string().optional(),
  },
)
export type IntegrationCallbackRequest = z.infer<
  typeof IntegrationCallbackRequestSchema
>

export const UpdateIntegrationConfigRequestSchema = IntegrationProviderScopeSchema.extend(
  {
    config: z.record(z.string(), z.any()),
  },
)
export type UpdateIntegrationConfigRequest = z.infer<
  typeof UpdateIntegrationConfigRequestSchema
>

export const TestIntegrationRequestSchema = IntegrationProviderScopeSchema.extend(
  {
    dryRun: z.coerce.boolean().optional().default(false),
  },
)
export type TestIntegrationRequest = z.infer<typeof TestIntegrationRequestSchema>

export const DeleteIntegrationRequestSchema = IntegrationProviderScopeSchema
export type DeleteIntegrationRequest = z.infer<
  typeof DeleteIntegrationRequestSchema
>

export const StartIntegrationPullSyncRequestSchema = IntegrationProviderScopeSchema.extend(
  {
    force: z.coerce.boolean().optional().default(false),
  },
)
export type StartIntegrationPullSyncRequest = z.infer<
  typeof StartIntegrationPullSyncRequestSchema
>

export const StartIntegrationPushSyncRequestSchema = IntegrationProviderScopeSchema.extend(
  {
    force: z.coerce.boolean().optional().default(false),
  },
)
export type StartIntegrationPushSyncRequest = z.infer<
  typeof StartIntegrationPushSyncRequestSchema
>

export const ListIntegrationSyncJobsRequestSchema = IntegrationProviderScopeSchema
export type ListIntegrationSyncJobsRequest = z.infer<
  typeof ListIntegrationSyncJobsRequestSchema
>

export const GetIntegrationSyncJobRequestSchema = IntegrationProviderScopeSchema.extend(
  {
    jobId: z.string(),
  },
)
export type GetIntegrationSyncJobRequest = z.infer<
  typeof GetIntegrationSyncJobRequestSchema
>

export interface IntegrationConnectionView {
  organizationId: string
  provider: IntegrationProvider
  status: IntegrationConnectionStatus
  connectedById: string | null
  connectedAt: string | null
  updatedAt: string
  lastSyncAt: string | null
  lastError: string | null
  config: Record<string, unknown>
}

export interface IntegrationSyncJobView {
  id: string
  organizationId: string
  provider: IntegrationProvider
  direction: IntegrationSyncDirection
  status: IntegrationSyncStatus
  recordsProcessed: number
  errorSummary: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}
