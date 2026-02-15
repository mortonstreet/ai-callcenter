import { z } from 'zod'

export const MagicLinkSignInRequestSchema = z.object({
  email: z.string().email(),
  callbackUrl: z.string().url().optional(),
  invitationId: z.string().optional(),
})
export type MagicLinkSignInRequest = z.infer<
  typeof MagicLinkSignInRequestSchema
>

export const MagicLinkVerifyRequestSchema = z.object({
  token: z.string().min(1),
  invitationId: z.string().optional(),
  email: z.string().email().optional(),
})
export type MagicLinkVerifyRequest = z.infer<typeof MagicLinkVerifyRequestSchema>

export const AuthErrorResponseSchema = z.object({
  code: z.string(),
  retryable: z.boolean(),
  userMessage: z.string(),
  correlationId: z.string(),
  details: z.record(z.string(), z.any()).optional(),
})
export type AuthErrorResponse = z.infer<typeof AuthErrorResponseSchema>
