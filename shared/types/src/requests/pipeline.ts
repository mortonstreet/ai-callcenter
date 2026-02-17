import { z } from 'zod';

// Pipeline Stage Schemas
export const GetPipelineStagesRequestSchema = z.object({
  organizationId: z.string(),
});
export type GetPipelineStagesRequest = z.infer<typeof GetPipelineStagesRequestSchema>;

export const CreatePipelineStageRequestSchema = z.object({
  organizationId: z.string(),
  label: z.string().min(1).max(100),
  color: z.string().default('#6B7280'),
  sortOrder: z.number().int().default(0),
  isDefault: z.boolean().default(false),
});
export type CreatePipelineStageRequest = z.infer<typeof CreatePipelineStageRequestSchema>;

export const UpdatePipelineStageRequestSchema = z.object({
  organizationId: z.string(),
  id: z.string(),
  label: z.string().min(1).max(100).optional(),
  color: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isDefault: z.boolean().optional(),
});
export type UpdatePipelineStageRequest = z.infer<typeof UpdatePipelineStageRequestSchema>;

export const DeletePipelineStageRequestSchema = z.object({
  organizationId: z.string(),
  id: z.string(),
});
export type DeletePipelineStageRequest = z.infer<typeof DeletePipelineStageRequestSchema>;

export const ReorderPipelineStagesRequestSchema = z.object({
  organizationId: z.string(),
  stages: z.array(z.object({
    id: z.string(),
    sortOrder: z.number().int(),
  })),
});
export type ReorderPipelineStagesRequest = z.infer<typeof ReorderPipelineStagesRequestSchema>;

export const MoveLeadToPipelineStageRequestSchema = z.object({
  organizationId: z.string(),
  id: z.string(),
  pipelineStageId: z.string(),
});
export type MoveLeadToPipelineStageRequest = z.infer<typeof MoveLeadToPipelineStageRequestSchema>;
