// Shared types stub for standalone frontend deployment
// These types are simplified versions for the landing page deployment

export interface DBUser {
  id: string;
  email: string;
  name: string;
  role: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DBOrganization {
  id: string;
  name: string;
  slug?: string;
  logo?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DBTask {
  id: string;
  title: string;
  name: string;
  description?: string;
  status: TaskStatus;
  priority?: string;
  dispatcherUserId?: string;
  agentId?: string;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DBRecording {
  id: string;
  url: string;
  duration: number;
  createdAt: Date;
}

export enum TaskStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum TaskFieldType {
  TEXT = "TEXT",
  STRING = "STRING",
  NUMBER = "NUMBER",
  DATE = "DATE",
  SELECT = "SELECT",
  BOOLEAN = "BOOLEAN",
  ADDRESS = "ADDRESS",
  PHONE_NUMBER = "PHONE_NUMBER",
  EMAIL_ADDRESS = "EMAIL_ADDRESS",
  TIME = "TIME",
  DATE_TIME = "DATE_TIME",
}

// Pipeline Stages for Kanban view
// Flow: New Leads → Follow Up → Booked → Dispatched → Closed Won/Lost
export const PipelineStage = {
  NEW: "new",
  FOLLOW_UP: "follow_up",
  BOOKED: "booked",
  DISPATCHED: "dispatched",
  CLOSED_WON: "closed_won",
  CLOSED_LOST: "closed_lost",
} as const;
export type PipelineStage = (typeof PipelineStage)[keyof typeof PipelineStage];

export enum AgentExternalType {
  ELEVENLABS = "ELEVENLABS",
  OPENAI = "OPENAI",
}

export enum CallQuality {
  EXCELLENT = "EXCELLENT",
  GOOD = "GOOD",
  FAIR = "FAIR",
  POOR = "POOR",
}

export interface TaskField {
  id: string;
  name: string;
  type: TaskFieldType;
  required: boolean;
  options?: string[];
}

export interface TaskFieldRequest {
  name: string;
  type: TaskFieldType;
  required?: boolean;
  description?: string;
  options?: string[];
}

export const STRIPE_PLANS = {
  FREE: "free",
  PRO: "pro",
  ENTERPRISE: "enterprise",
} as const;

// Additional types for hooks
export interface DBAgent {
  id: string;
  name: string;
  description?: string;
  externalType: AgentExternalType;
  externalId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  agentId: string;
  fields?: TaskFieldRequest[];
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  fields?: TaskFieldRequest[];
}

export interface GetRecordingsRequest {
  page?: number;
  limit?: number;
  agentId?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AccountResponse {
  user: DBUser;
  organizations: DBOrganization[];
}

export interface GetTaskInstancesRequest {
  page?: number;
  limit?: number;
  taskId?: string;
  status?: TaskStatus;
}

export interface UpdateTaskInstanceStatusRequest {
  status: TaskStatus;
}

export interface TaskInstanceDetailsResponse {
  id: string;
  taskId: string;
  status: TaskStatus;
  fields: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

