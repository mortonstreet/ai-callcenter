import { z } from 'zod';

export const ErrorSeveritySchema = z.enum(['info', 'warn', 'error', 'critical']);
export type ErrorSeverity = z.infer<typeof ErrorSeveritySchema>;

export const CreateErrorLogRequestSchema = z.object({
  organizationId: z.string().optional(),
  source: z.string().min(1),
  severity: ErrorSeveritySchema.default('error'),
  code: z.string().optional(),
  message: z.string().min(1),
  context: z.record(z.string(), z.unknown()).optional(),
});
export type CreateErrorLogRequest = z.infer<typeof CreateErrorLogRequestSchema>;

export const ResolveErrorLogRequestSchema = z.object({
  id: z.string(),
  resolvedByUserId: z.string(),
  resolvedAt: z.coerce.date().default(() => new Date()),
});
export type ResolveErrorLogRequest = z.infer<typeof ResolveErrorLogRequestSchema>;

export const ListErrorLogsRequestSchema = z.object({
  organizationId: z.string().optional(),
  severity: ErrorSeveritySchema.optional(),
  source: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});
export type ListErrorLogsRequest = z.infer<typeof ListErrorLogsRequestSchema>;

export const CreateAdminAuditLogRequestSchema = z.object({
  organizationId: z.string().optional(),
  actorUserId: z.string().optional(),
  action: z.string().min(1),
  resourceType: z.string().min(1),
  resourceId: z.string().optional(),
  before: z.record(z.string(), z.unknown()).optional(),
  after: z.record(z.string(), z.unknown()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});
export type CreateAdminAuditLogRequest = z.infer<
  typeof CreateAdminAuditLogRequestSchema
>;

export const ListAdminAuditLogsRequestSchema = z.object({
  organizationId: z.string().optional(),
  actorUserId: z.string().optional(),
  resourceType: z.string().optional(),
  action: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});
export type ListAdminAuditLogsRequest = z.infer<
  typeof ListAdminAuditLogsRequestSchema
>;
