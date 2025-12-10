
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
// Flow: New Leads → Follow Up → Booked → Dispatched → Closed Won/Lost
export const PipelineStage = {
  NEW: "new",
  FOLLOW_UP: "follow_up",
  BOOKED: "booked",        // Customer has booked an appointment
  DISPATCHED: "dispatched", // Technician/team dispatched to customer
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
// Used to filter out spam/robocalls from productive call metrics
export const CallQuality = {
  PRODUCTIVE: "productive",        // Real conversation with info exchange
  SHORT_CALL: "short_call",        // Under 15 seconds, likely unproductive
  NO_CONVERSATION: "no_conversation", // No meaningful back-and-forth
  ROBOCALL: "robocall",            // Automated/robot caller detected
  SPAM: "spam",                    // Spam or prank call
} as const;
export type CallQuality = (typeof CallQuality)[keyof typeof CallQuality];