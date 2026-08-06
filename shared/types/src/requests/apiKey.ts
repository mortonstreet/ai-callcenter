import { z } from 'zod'

export const ApiKeyScopeSchema = z.enum([
  'api:read',
  'api:write',
  'mcp:connect',
])

export const ApiKeyScopesSchema = z
  .array(ApiKeyScopeSchema)
  .min(1)
  .transform((scopes) => Array.from(new Set(scopes)))

export const ListApiKeysRequestSchema = z.object({
  organizationId: z.string().min(1),
})

export const CreateApiKeyRequestSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  scopes: ApiKeyScopesSchema,
  expiresAt: z.coerce.date().optional().nullable(),
})

export const RevokeApiKeyRequestSchema = z.object({
  organizationId: z.string().min(1),
  id: z.string().min(1),
})

export type ApiKeyScope = z.infer<typeof ApiKeyScopeSchema>
export type ListApiKeysRequest = z.infer<typeof ListApiKeysRequestSchema>
export type CreateApiKeyRequest = z.infer<typeof CreateApiKeyRequestSchema>
export type RevokeApiKeyRequest = z.infer<typeof RevokeApiKeyRequestSchema>
