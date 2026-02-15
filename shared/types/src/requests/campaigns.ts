import { z } from 'zod'

const campaignChannels = ['voice', 'sms', 'email'] as const
const campaignStatuses = [
  'draft',
  'active',
  'paused',
  'completed',
  'failed',
] as const
const campaignEnrollmentStatuses = [
  'active',
  'paused',
  'completed',
  'replied',
  'unsubscribed',
  'failed',
] as const

export const CampaignChannelSchema = z.enum(campaignChannels)
export type CampaignChannel = z.infer<typeof CampaignChannelSchema>

export const CampaignStatusSchema = z.enum(campaignStatuses)
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>

export const CampaignEnrollmentStatusSchema = z.enum(campaignEnrollmentStatuses)
export type CampaignEnrollmentStatus = z.infer<
  typeof CampaignEnrollmentStatusSchema
>

const CampaignOrganizationScopeSchema = z.object({
  organizationId: z.string().optional().default(''),
})

const CampaignRouteScopeSchema = CampaignOrganizationScopeSchema.extend({
  id: z.string(),
})

const CampaignStepRouteScopeSchema = CampaignRouteScopeSchema.extend({
  stepId: z.string(),
})

const CampaignEnrollmentRouteScopeSchema = CampaignRouteScopeSchema.extend({
  enrollmentId: z.string(),
})

export const ListCampaignsRequestSchema = CampaignOrganizationScopeSchema.extend({
  status: CampaignStatusSchema.optional(),
  channel: CampaignChannelSchema.optional(),
})
export type ListCampaignsRequest = z.infer<typeof ListCampaignsRequestSchema>

export const CreateCampaignRequestSchema = CampaignOrganizationScopeSchema.extend({
  name: z.string().min(1),
  description: z.string().optional(),
  channels: z.array(CampaignChannelSchema).min(1),
  allowMemberEnrollment: z.coerce.boolean().optional().default(false),
})
export type CreateCampaignRequest = z.infer<typeof CreateCampaignRequestSchema>

export const GetCampaignRequestSchema = CampaignRouteScopeSchema
export type GetCampaignRequest = z.infer<typeof GetCampaignRequestSchema>

export const UpdateCampaignRequestSchema = CampaignRouteScopeSchema.extend({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  channels: z.array(CampaignChannelSchema).min(1).optional(),
  allowMemberEnrollment: z.coerce.boolean().optional(),
})
export type UpdateCampaignRequest = z.infer<typeof UpdateCampaignRequestSchema>

export const DeleteCampaignRequestSchema = CampaignRouteScopeSchema
export type DeleteCampaignRequest = z.infer<typeof DeleteCampaignRequestSchema>

export const ActivateCampaignRequestSchema = CampaignRouteScopeSchema
export type ActivateCampaignRequest = z.infer<
  typeof ActivateCampaignRequestSchema
>

export const PauseCampaignRequestSchema = CampaignRouteScopeSchema
export type PauseCampaignRequest = z.infer<typeof PauseCampaignRequestSchema>

export const CreateCampaignStepRequestSchema = CampaignRouteScopeSchema.extend({
  channel: CampaignChannelSchema,
  offsetMinutes: z.coerce.number().int().nonnegative().default(0),
  template: z.string().min(1),
  skipIfReplied: z.coerce.boolean().optional().default(true),
  skipIfBooked: z.coerce.boolean().optional().default(true),
  metadata: z.record(z.string(), z.any()).optional(),
})
export type CreateCampaignStepRequest = z.infer<
  typeof CreateCampaignStepRequestSchema
>

export const UpdateCampaignStepRequestSchema = CampaignStepRouteScopeSchema.extend({
  channel: CampaignChannelSchema.optional(),
  offsetMinutes: z.coerce.number().int().nonnegative().optional(),
  template: z.string().min(1).optional(),
  skipIfReplied: z.coerce.boolean().optional(),
  skipIfBooked: z.coerce.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})
export type UpdateCampaignStepRequest = z.infer<
  typeof UpdateCampaignStepRequestSchema
>

export const DeleteCampaignStepRequestSchema = CampaignStepRouteScopeSchema
export type DeleteCampaignStepRequest = z.infer<
  typeof DeleteCampaignStepRequestSchema
>

export const ListCampaignEnrollmentsRequestSchema = CampaignRouteScopeSchema.extend(
  {
    status: CampaignEnrollmentStatusSchema.optional(),
  },
)
export type ListCampaignEnrollmentsRequest = z.infer<
  typeof ListCampaignEnrollmentsRequestSchema
>

export const CreateCampaignEnrollmentRequestSchema = CampaignRouteScopeSchema.extend(
  {
    leadId: z.string(),
    contact: z.object({
      name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
    }),
  },
)
export type CreateCampaignEnrollmentRequest = z.infer<
  typeof CreateCampaignEnrollmentRequestSchema
>

export const CreateCampaignEnrollmentsFromListRequestSchema = CampaignRouteScopeSchema.extend(
  {
    listId: z.string(),
    leadIds: z.array(z.string()).optional(),
  },
)
export type CreateCampaignEnrollmentsFromListRequest = z.infer<
  typeof CreateCampaignEnrollmentsFromListRequestSchema
>

export const DeleteCampaignEnrollmentRequestSchema = CampaignEnrollmentRouteScopeSchema
export type DeleteCampaignEnrollmentRequest = z.infer<
  typeof DeleteCampaignEnrollmentRequestSchema
>

export const GetCampaignStatsRequestSchema = CampaignRouteScopeSchema
export type GetCampaignStatsRequest = z.infer<typeof GetCampaignStatsRequestSchema>

export const GetCampaignEventsRequestSchema = CampaignRouteScopeSchema.extend({
  limit: z.coerce.number().int().positive().max(500).default(100),
})
export type GetCampaignEventsRequest = z.infer<typeof GetCampaignEventsRequestSchema>

export interface CampaignStepView {
  id: string
  channel: CampaignChannel
  offsetMinutes: number
  template: string
  skipIfReplied: boolean
  skipIfBooked: boolean
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CampaignEnrollmentView {
  id: string
  leadId: string
  status: CampaignEnrollmentStatus
  source: 'manual' | 'list'
  sourceId: string | null
  contact: {
    name?: string
    phone?: string
    email?: string
  }
  createdAt: string
  updatedAt: string
}

export interface CampaignEventView {
  id: string
  campaignId: string
  organizationId: string
  type: string
  createdAt: string
  details: Record<string, unknown>
}

export interface CampaignView {
  id: string
  organizationId: string
  name: string
  description: string | null
  status: CampaignStatus
  channels: CampaignChannel[]
  allowMemberEnrollment: boolean
  createdAt: string
  updatedAt: string
  activatedAt: string | null
  pausedAt: string | null
  steps: CampaignStepView[]
}

export interface CampaignStatsView {
  campaignId: string
  organizationId: string
  totals: {
    enrollments: number
    activeEnrollments: number
    replied: number
    unsubscribed: number
    failed: number
  }
  channelMix: Record<CampaignChannel, number>
  updatedAt: string
}
