// =============================================================================
// SHARED TYPES - Standalone version for frontend deployment
// Generated from @shared/db and @shared/types packages
// =============================================================================

// =============================================================================
// AGENT TYPES
// =============================================================================
export const AgentExternalType = {
  ELEVEN_LABS: 'eleven_labs',
  LOCAL_FALLBACK: 'local_fallback',
} as const;
export type AgentExternalType = (typeof AgentExternalType)[keyof typeof AgentExternalType];

export const Industry = {
  PEST_CONTROL: 'pest_control',
  HVAC: 'hvac',
  ROOFING: 'roofing',
  ELECTRICAL: 'electrical',
  CLEANING_SERVICES: 'cleaning_services',
} as const;
export type Industry = (typeof Industry)[keyof typeof Industry];

export const UseCase = {
  CUSTOMER_SUPPORT: 'customer_support',
  OUTBOUND_SALES: 'outbound_sales',
  SCHEDULING: 'scheduling',
  LEAD_QUALIFICATION: 'lead_qualification',
  ANSWERING_SERVICE: 'answering_service',
} as const;
export type UseCase = (typeof UseCase)[keyof typeof UseCase];

export const AgentStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  ARCHIVED: 'archived',
  ERROR: 'error',
} as const;
export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];

// =============================================================================
// ORGANIZATION TYPES
// =============================================================================
export const OrganizationRole = {
  ADMIN: 'admin',
  OWNER: 'owner',
  MEMBER: 'member',
} as const;
export type OrganizationRole = (typeof OrganizationRole)[keyof typeof OrganizationRole];

// =============================================================================
// TASK TYPES
// =============================================================================
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

// =============================================================================
// DATABASE TYPES (from Prisma generated types)
// =============================================================================
type Timestamp = Date | string;

export interface DBUser {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  email: string;
  emailVerified: boolean;
  name: string | null;
  image: string | null;
  permission: string;
  stripeCustomerId: string | null;
  lastActiveOrganizationId: string | null;
  isAdmin: boolean;
}

export interface DBAccount {
  id: string;
  accountId: string;
  providerId: string;
  userId: string;
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  accessTokenExpiresAt: Timestamp | null;
  refreshTokenExpiresAt: Timestamp | null;
  scope: string | null;
  password: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DBSession {
  id: string;
  expiresAt: Timestamp;
  token: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  ipAddress: string | null;
  userAgent: string | null;
  userId: string;
  activeOrganizationId: string | null;
}

export interface DBOrganization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: Timestamp;
  metadata: string | null;
}

export interface DBAgent {
  id: string;
  name: string;
  slug: string;
  organizationId: string;
  phoneNumber: string;
  redirectNumber: string;
  externalId: string;
  externalType: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  industry: string | null;
  useCase: string | null;
  website: string | null;
  mainGoal: string | null;
  voiceId: string | null;
  status: string;
  syncPending: boolean;
  lastSyncAt: Timestamp | null;
  lastSyncError: string | null;
  providerCorrelationKey: string | null;
  mcpApiKey: string | null;
  webhookSecret: string | null;
  mcpEndpointUrl: string | null;
}

export interface DBTask {
  id: string;
  name: string;
  description: string | null;
  agentId: string;
  organizationId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  requiredInfo: unknown;
  dispatcherUserId: string | null;
}

export interface DBTaskInstance {
  id: string;
  taskId: string;
  status: string;
  requiredInfo: unknown;
  info: unknown;
  conversationId: string;
  callSid: string | null;
  dispatcherId: string | null;
  organizationId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  leadType: string | null;
  resolutionType: string | null;
  customerType: string | null;
  leadScore: number | null;
  estimatedValue: number | null;
  calcomBookingId: string | null;
  calcomEventId: number | null;
  appointmentTime: Timestamp | null;
  bookingStatus: string | null;
  bookingCancelledAt: Timestamp | null;
  bookingCancelReason: string | null;
  tags: unknown | null;
  pipelineStage: string | null;
  pipelineStageId: string | null;
}

export interface DBRecording {
  id: string;
  conversationId: string;
  callSid: string;
  taskInstanceId: string | null;
  organizationId: string;
  callDurationSeconds: number;
  cost: number;
  transcriptSummary: string | null;
  payload: unknown;
  callQuality: string | null;
  callQualityReason: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DBInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt: Timestamp;
  createdAt: Timestamp;
  inviterId: string;
}

export interface DBMember {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt: Timestamp;
}

export interface DBSubscription {
  id: string;
  plan: string;
  referenceId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: string | null;
  periodStart: Timestamp | null;
  periodEnd: Timestamp | null;
  trialStart: Timestamp | null;
  trialEnd: Timestamp | null;
  cancelAtPeriodEnd: boolean | null;
  seats: number | null;
}

export interface DBLead {
  id: string;
  organizationId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  normalizedPhone: string | null;
  company: string | null;
  title: string | null;
  linkedInUrl: string | null;
  website: string | null;
  customFields: unknown | null;
  pipelineStageId: string | null;
  dealValue: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
}

// =============================================================================
// REQUEST TYPES
// =============================================================================

// Task Field Request
export interface TaskFieldRequest {
  name: string;
  type: TaskFieldType;
  description?: string;
}

// Create Task Request
export interface CreateTaskRequest {
  name: string;
  description?: string;
  organizationId: string;
  agentId: string;
  fields: TaskFieldRequest[];
  dispatcherUserId?: string;
}

// Update Task Request (extends CreateTaskRequest + id)
export interface UpdateTaskRequest {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  agentId: string;
  fields: TaskFieldRequest[];
  dispatcherUserId?: string;
}

// Get Tasks Request
export interface GetTasksRequest {
  agentId: string;
  organizationId: string;
}

// Delete Task Request
export interface DeleteTaskRequest {
  id: string;
  organizationId: string;
}

// Pagination Request
export interface PaginationRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Get Task Instances Request
export interface GetTaskInstancesRequest extends PaginationRequest {
  organizationId: string;
  taskId?: string;
  dispatcherId?: string;
  status?: TaskStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
}

// Get Single Task Instance Request
export interface GetTaskInstanceRequest {
  id: string;
  organizationId: string;
}

// Update Task Instance Status Request
export interface UpdateTaskInstanceStatusRequest {
  id: string;
  organizationId: string;
  status: TaskStatus;
}

// Get Recordings Request
export interface GetRecordingsRequest extends PaginationRequest {
  organizationId: string;
  startDate?: string;
  endDate?: string;
}

// Get Agents Request
export interface GetAgentsRequest {
  organizationId: string;
}

// Get Agent Request
export interface GetAgentRequest {
  id: string;
  organizationId: string;
}

// Admin Create Organization Request
export interface AdminCreateOrganizationRequest {
  name: string;
  ownerEmail: string;
}

// Admin Create Agent Request
export interface AdminCreateAgentRequest {
  organizationId: string;
  name: string;
  phoneNumber: string;
  redirectNumber: string;
  externalId: string;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

// Task Instance with Dispatcher info
export interface TaskInstanceWithDispatcher extends DBTaskInstance {
  dispatcherName: string | null;
  dispatcherEmail: string | null;
}

// Task Instance Details Response
export interface TaskInstanceDetailsResponse {
  taskInstance: TaskInstanceWithDispatcher;
  task: DBTask;
  recording: DBRecording | null;
}

// Paginated Response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Account Response
export type AccountResponse = DBAccount;
export type UserResponse = DBUser;

// =============================================================================
// PAGINATION TYPES
// =============================================================================
export type DBPagination = {
  page: number;
  limit: number;
  offset: number;
};

// =============================================================================
// ADMIN TYPES
// =============================================================================
export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  organizations: string[];
  emailVerified: boolean;
  role: string;
  createdAt: string;
}

export interface AdminOrganization {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
  creditBalance: number;
  createdAt: string;
}

export interface ErrorLogItem {
  id: string;
  code: string;
  message: string;
  severity: string;
  status: string;
  product: string;
  organizationName: string | null;
  occurredAt: string;
}

export interface ErrorLogDetail extends ErrorLogItem {
  stackTrace: string | null;
  metadata: Record<string, unknown> | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
}
