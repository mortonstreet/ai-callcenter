// Shared types for standalone frontend deployment
// Based on @shared/types and @shared/db packages

// ============================================
// Agent Types (from shared/types/src/agent.ts)
// ============================================
export const AgentExternalType = {
  ELEVEN_LABS: 'eleven_labs',
} as const;
export type AgentExternalType = (typeof AgentExternalType)[keyof typeof AgentExternalType];

// ============================================
// Organization Types (from shared/types/src/organization.ts)
// ============================================
export const OrganizationRole = {
  ADMIN: 'admin',
  OWNER: 'owner',
  MEMBER: 'member',
} as const;
export type OrganizationRole = (typeof OrganizationRole)[keyof typeof OrganizationRole];

// ============================================
// Task Types (from shared/types/src/task.ts)
// ============================================
export const TaskFieldType = {
  STRING: 'string',
  NUMBER: 'number',
  ADDRESS: 'address',
  PHONE_NUMBER: 'phone_number',
  EMAIL_ADDRESS: 'email_address',
  BOOLEAN: 'boolean',
  DATE_TIME: 'date_time',
  TIME: 'time',
} as const;
export type TaskFieldType = (typeof TaskFieldType)[keyof typeof TaskFieldType];

export interface TaskField {
  name: string;
  nameSlug: string;
  type: TaskFieldType;
  description: string;
}

export const TaskStatus = {
  PENDING: "pending",
  DISPATCHED: "dispatched",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

// Lead Classification Types
export const LeadType = {
  BOOKING: "booking",
  NON_BOOKING: "non_booking",
} as const;
export type LeadType = (typeof LeadType)[keyof typeof LeadType];

export const ResolutionType = {
  RESOLVED: "resolved",
  UNRESOLVED: "unresolved",
} as const;
export type ResolutionType = (typeof ResolutionType)[keyof typeof ResolutionType];

// Customer Classification
export const CustomerType = {
  NEW_CUSTOMER: "new_customer",
  ACTIVE_CUSTOMER: "active_customer",
} as const;
export type CustomerType = (typeof CustomerType)[keyof typeof CustomerType];

// Pipeline Stages for Kanban view
export const PipelineStage = {
  NEW: "new",
  FOLLOW_UP: "follow_up",
  BOOKED: "booked",
  DISPATCHED: "dispatched",
  CLOSED_WON: "closed_won",
  CLOSED_LOST: "closed_lost",
} as const;
export type PipelineStage = (typeof PipelineStage)[keyof typeof PipelineStage];

// Lead Tags
export const LeadTag = {
  HUMAN_CALLER: "human_caller",
  ROBO_CALLER: "robo_caller",
  URGENT: "urgent",
  HIGH_VALUE: "high_value",
  RETURN_CUSTOMER: "return_customer",
  COMMERCIAL: "commercial",
  RESIDENTIAL: "residential",
} as const;
export type LeadTag = (typeof LeadTag)[keyof typeof LeadTag];

// Call Quality Classification
export const CallQuality = {
  PRODUCTIVE: "productive",
  SHORT_CALL: "short_call",
  NO_CONVERSATION: "no_conversation",
  ROBOCALL: "robocall",
  SPAM: "spam",
} as const;
export type CallQuality = (typeof CallQuality)[keyof typeof CallQuality];

// ============================================
// DB Types (based on Prisma schema)
// ============================================
export interface DBUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface DBOrganization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface DBAgent {
  id: string;
  name: string;
  description?: string | null;
  externalType: AgentExternalType;
  externalId?: string | null;
  organizationId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface DBTask {
  id: string;
  name: string;
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: string | null;
  agentId: string;
  organizationId: string;
  dispatcherUserId?: string | null;
  fields?: TaskField[] | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface DBTaskInstance {
  id: string;
  taskId: string;
  status: TaskStatus;
  fields: Record<string, unknown>;
  recordingId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface DBRecording {
  id: string;
  url?: string | null;
  duration?: number | null;
  agentId?: string | null;
  organizationId: string;
  taskInstanceId?: string | null;
  callQuality?: CallQuality | null;
  leadType?: LeadType | null;
  pipelineStage?: PipelineStage | null;
  tags?: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface DBInvitation {
  id: string;
  email: string;
  organizationId: string;
  role: OrganizationRole;
  status: string;
  expiresAt: Date | string;
  createdAt: Date | string;
}

export interface DBSession {
  id: string;
  userId: string;
  expiresAt: Date | string;
  createdAt: Date | string;
}

export interface DBAccount {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  createdAt: Date | string;
}

// ============================================
// Request/Response Types
// ============================================
export interface TaskFieldRequest {
  name: string;
  type: TaskFieldType;
  required?: boolean;
  description?: string;
  options?: string[];
}

export interface CreateTaskRequest {
  name: string;
  title?: string;
  description?: string;
  agentId: string;
  fields?: TaskFieldRequest[];
}

export interface UpdateTaskRequest {
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  dispatcherUserId?: string | null;
  fields?: TaskFieldRequest[];
}

export interface GetRecordingsRequest {
  page?: number;
  limit?: number;
  agentId?: string;
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
  createdAt: Date | string;
  updatedAt: Date | string;
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

// ============================================
// Stripe Types
// ============================================
export const STRIPE_PLANS = {
  FREE: "free",
  PRO: "pro",
  ENTERPRISE: "enterprise",
} as const;
export type StripePlan = (typeof STRIPE_PLANS)[keyof typeof STRIPE_PLANS];

// ============================================
// Pagination Types
// ============================================
export type DBPagination = {
  page: number;
  limit: number;
  offset: number;
};
