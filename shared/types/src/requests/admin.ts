import { z } from 'zod'

const IsoDateTimeSchema = z
  .string()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: 'Invalid ISO date-time value',
  })

const DemoUsageLimitsSchema = z
  .object({
    maxSeats: z.coerce.number().int().positive().max(10000).optional(),
    maxAgents: z.coerce.number().int().positive().max(1000).optional(),
    maxMonthlyCalls: z.coerce.number().int().nonnegative().max(1000000).optional(),
  })
  .strict()

const DemoOnboardingSchema = z
  .object({
    domain: z.string().min(1).optional(),
    industry: z.string().min(1).optional(),
    services: z.array(z.string().min(1)).default([]),
    useCase: z.string().min(1).optional(),
    website: z.string().url().optional(),
    mainGoal: z.string().min(1).optional(),
    agentName: z.string().min(1).optional(),
  })
  .strict()

const DemoTenantStatusSchema = z.enum([
  'pending_approval',
  'approved',
  'expired',
  'suspended',
  'converted',
])

export const AdminCreateOrganizationRequestSchema = z.object({
  name: z.string(),
  ownerEmail: z.string(),
})

export const AdminCreateAgentRequestSchema = z.object({
  organizationId: z.string(),
  name: z.string(),
  phoneNumber: z.string(),
  redirectNumber: z.string(),
  externalId: z.string(),
})

const DemoTenantOrganizationSchema = z.object({
  organizationId: z.string().min(1),
})

export const AdminListDemoTenantsRequestSchema = z.object({
  status: DemoTenantStatusSchema.optional(),
})

export const AdminCreateDemoTenantRequestSchema = z.object({
  name: z.string().min(1),
  ownerEmail: z.string().email(),
  ownerName: z.string().min(1).optional(),
  expiresAt: IsoDateTimeSchema.optional(),
  usageLimits: DemoUsageLimitsSchema.optional(),
  onboarding: DemoOnboardingSchema.optional(),
  approvalNotes: z.string().min(1).optional(),
})

export const AdminApproveDemoTenantRequestSchema =
  DemoTenantOrganizationSchema.extend({
    expiresAt: IsoDateTimeSchema.optional(),
    usageLimits: DemoUsageLimitsSchema.optional(),
    approvalNotes: z.string().min(1).optional(),
  })

export const AdminExtendDemoTenantRequestSchema =
  DemoTenantOrganizationSchema.extend({
    expiresAt: IsoDateTimeSchema,
    extensionReason: z.string().min(3),
  })

export const AdminSuspendDemoTenantRequestSchema =
  DemoTenantOrganizationSchema.extend({
    reason: z.string().min(3),
  })

export const AdminConvertDemoTenantRequestSchema =
  DemoTenantOrganizationSchema.extend({
    targetPlan: z.enum(['paid']).default('paid'),
    reason: z.string().min(3).optional(),
  })

export const AdminHandoffDemoTenantOwnerRequestSchema =
  DemoTenantOrganizationSchema.extend({
    ownerEmail: z.string().email(),
    ownerName: z.string().min(1).optional(),
    role: z.enum(['owner', 'admin']).default('owner'),
  })

export type AdminCreateOrganizationRequest = z.infer<
  typeof AdminCreateOrganizationRequestSchema
>
export type AdminCreateAgentRequest = z.infer<typeof AdminCreateAgentRequestSchema>
export type AdminListDemoTenantsRequest = z.infer<
  typeof AdminListDemoTenantsRequestSchema
>
export type AdminCreateDemoTenantRequest = z.infer<
  typeof AdminCreateDemoTenantRequestSchema
>
export type AdminApproveDemoTenantRequest = z.infer<
  typeof AdminApproveDemoTenantRequestSchema
>
export type AdminExtendDemoTenantRequest = z.infer<
  typeof AdminExtendDemoTenantRequestSchema
>
export type AdminSuspendDemoTenantRequest = z.infer<
  typeof AdminSuspendDemoTenantRequestSchema
>
export type AdminConvertDemoTenantRequest = z.infer<
  typeof AdminConvertDemoTenantRequestSchema
>
export type AdminHandoffDemoTenantOwnerRequest = z.infer<
  typeof AdminHandoffDemoTenantOwnerRequestSchema
>
export type DemoTenantStatus = z.infer<typeof DemoTenantStatusSchema>
export type DemoUsageLimits = z.infer<typeof DemoUsageLimitsSchema>
export type DemoOnboarding = z.infer<typeof DemoOnboardingSchema>
