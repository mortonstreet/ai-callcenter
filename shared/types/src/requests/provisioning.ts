import { z } from 'zod'

export const GetProvisioningJobSchema = z.object({
  jobId: z.string().min(1),
})

export type GetProvisioningJobRequest = z.infer<typeof GetProvisioningJobSchema>

export const GetProvisioningJobStepsSchema = z.object({
  jobId: z.string().min(1),
})

export type GetProvisioningJobStepsRequest = z.infer<
  typeof GetProvisioningJobStepsSchema
>

export const RetryProvisioningJobSchema = z.object({
  jobId: z.string().min(1),
  note: z.string().max(500).optional(),
  idempotencyKey: z.string().trim().min(1).max(256).optional(),
})

export type RetryProvisioningJobRequest = z.infer<
  typeof RetryProvisioningJobSchema
>

export const GetLatestProvisioningJobForAgentSchema = z.object({
  agentId: z.string().min(1),
})

export type GetLatestProvisioningJobForAgentRequest = z.infer<
  typeof GetLatestProvisioningJobForAgentSchema
>

export const GetProvisioningJobRequestSchema = GetProvisioningJobSchema
export const GetProvisioningJobStepsRequestSchema =
  GetProvisioningJobStepsSchema
export const RetryProvisioningJobRequestSchema = RetryProvisioningJobSchema
export const GetLatestAgentProvisioningJobRequestSchema =
  GetLatestProvisioningJobForAgentSchema

export type GetLatestAgentProvisioningJobRequest =
  GetLatestProvisioningJobForAgentRequest
