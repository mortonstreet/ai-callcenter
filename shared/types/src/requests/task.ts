import { z } from 'zod';
import { TaskFieldType, TaskStatus } from '../task';
import { PaginationRequestSchema } from './pagination';
import { DBTask, DBTaskInstance, DBRecording } from '@shared/db/src';

export const TaskFieldSchema = z.object({
  name: z.string().min(1),
  type: z.enum(Object.values(TaskFieldType)),
  description: z.string().optional(),
});

export const CreateTaskRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  organizationId: z.string(),
  agentId: z.string(),
  fields: z.array(TaskFieldSchema).min(1),
  dispatcherUserId: z.string().optional(),
});

export const GetTasksRequestSchema = z.object({
  agentId: z.string(),
  organizationId: z.string(),
});

export const UpdateTaskRequestSchema = CreateTaskRequestSchema.extend({
  id: z.string(),
});

export const DeleteTaskRequestSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
});

// Task Instance Requests
export const GetTaskInstancesRequestSchema = PaginationRequestSchema.extend({
  organizationId: z.string(),
  taskId: z.string().optional(),
  dispatcherId: z.string().optional(),
  status: z.enum(Object.values(TaskStatus) as [string, ...string[]]).optional(),
  search: z.string().optional(), // For searching task names
  startDate: z.string().optional(), // ISO date string for filtering
  endDate: z.string().optional(), // ISO date string for filtering
});

export const UpdateTaskInstanceStatusRequestSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  status: z.enum(Object.values(TaskStatus) as [string, ...string[]]),
});

// Single Task Instance Request with full details
export const GetTaskInstanceRequestSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
});

// Extended task instance with dispatcher info
export type TaskInstanceWithDispatcher = DBTaskInstance & {
  dispatcherName: string | null;
  dispatcherEmail: string | null;
};

// Response type for full task instance details
export type TaskInstanceDetailsResponse = {
  taskInstance: TaskInstanceWithDispatcher;
  task: DBTask;
  recording: DBRecording | null;
};

// Recording Requests
export const GetRecordingsRequestSchema = PaginationRequestSchema.extend({
  organizationId: z.string(),
  startDate: z.string().optional(), // ISO date string for filtering
  endDate: z.string().optional(), // ISO date string for filtering
});

export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;
export type GetTasksRequest = z.infer<typeof GetTasksRequestSchema>;
export type TaskFieldRequest = z.infer<typeof TaskFieldSchema>;
export type UpdateTaskRequest = z.infer<typeof UpdateTaskRequestSchema>;
export type DeleteTaskRequest = z.infer<typeof DeleteTaskRequestSchema>;
export type GetTaskInstancesRequest = z.infer<typeof GetTaskInstancesRequestSchema>;
export type GetTaskInstanceRequest = z.infer<typeof GetTaskInstanceRequestSchema>;
export type UpdateTaskInstanceStatusRequest = z.infer<typeof UpdateTaskInstanceStatusRequestSchema>;
export type GetRecordingsRequest = z.infer<typeof GetRecordingsRequestSchema>;

