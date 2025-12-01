import { z } from 'zod';

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

export type AdminCreateOrganizationRequest = z.infer<typeof AdminCreateOrganizationRequestSchema>
export type AdminCreateAgentRequest = z.infer<typeof AdminCreateAgentRequestSchema>