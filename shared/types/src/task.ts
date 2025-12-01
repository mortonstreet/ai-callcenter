

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