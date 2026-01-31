import type { ColumnType } from 'kysely'
export type Generated<T> =
  T extends ColumnType<infer S, infer I, infer U>
    ? ColumnType<S, I | undefined, U>
    : ColumnType<T, T | undefined, T>
export type Timestamp = ColumnType<Date, Date | string, Date | string>

export type Account = {
  id: string
  accountId: string
  providerId: string
  userId: string
  accessToken: string | null
  refreshToken: string | null
  idToken: string | null
  accessTokenExpiresAt: Timestamp | null
  refreshTokenExpiresAt: Timestamp | null
  scope: string | null
  password: string | null
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
}
export type Agent = {
  id: string
  name: string
  slug: string
  organizationId: string
  phoneNumber: string
  redirectNumber: string
  externalId: string
  externalType: string
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
  mcpApiKey: string | null
  webhookSecret: string | null
  mcpEndpointUrl: string | null
}
export type CallDisposition = {
  id: string
  organizationId: string
  label: string
  color: Generated<string | null>
  sortOrder: Generated<number>
  isDefault: Generated<boolean>
  createdAt: Generated<Timestamp>
}
export type CallLog = {
  id: string
  organizationId: string
  userId: string | null
  callSid: string | null
  direction: string
  fromNumber: string
  toNumber: string
  status: Generated<string>
  duration: Generated<number>
  recordingUrl: string | null
  recordingSid: string | null
  outcome: string | null
  notes: string | null
  dispositionId: string | null
  leadId: string | null
  startedAt: Generated<Timestamp>
  endedAt: Timestamp | null
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
}
export type Example = {
  id: string
  name: string
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
}
export type Lead = {
  id: string
  organizationId: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  normalizedPhone: string | null
  company: string | null
  title: string | null
  linkedInUrl: string | null
  website: string | null
  customFields: unknown | null
  pipelineStageId: string | null
  dealValue: string | null
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
  deletedAt: Timestamp | null
}
export type Invitation = {
  id: string
  organizationId: string
  email: string
  role: string | null
  status: string
  expiresAt: Timestamp
  createdAt: Timestamp
  inviterId: string
}
export type Member = {
  id: string
  organizationId: string
  userId: string
  role: string
  createdAt: Timestamp
}
export type Organization = {
  id: string
  name: string
  slug: string
  logo: string | null
  createdAt: Timestamp
  metadata: string | null
}
export type PipelineStage = {
  id: string
  organizationId: string
  label: string
  color: Generated<string>
  sortOrder: Generated<number>
  isDefault: Generated<boolean>
  createdAt: Generated<Timestamp>
}
export type Recording = {
  id: string
  conversationId: string
  callSid: string
  taskInstanceId: string | null
  organizationId: string
  callDurationSeconds: number
  cost: number
  transcriptSummary: string | null
  payload: unknown
  callQuality: string | null
  callQualityReason: string | null
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
}
export type Session = {
  id: string
  expiresAt: Timestamp
  token: string
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
  ipAddress: string | null
  userAgent: string | null
  userId: string
  activeOrganizationId: string | null
}
export type Subscription = {
  id: string
  plan: string
  referenceId: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  status: Generated<string | null>
  periodStart: Timestamp | null
  periodEnd: Timestamp | null
  trialStart: Timestamp | null
  trialEnd: Timestamp | null
  cancelAtPeriodEnd: Generated<boolean | null>
  seats: number | null
}
export type Task = {
  id: string
  name: string
  description: string | null
  agentId: string
  organizationId: string
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
  requiredInfo: unknown
  dispatcherUserId: string | null
}
export type TaskInstance = {
  id: string
  taskId: string
  status: Generated<string>
  requiredInfo: unknown
  info: unknown
  conversationId: string
  callSid: string | null
  dispatcherId: string | null
  organizationId: string | null
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
  leadType: string | null
  resolutionType: string | null
  customerType: string | null
  leadScore: number | null
  estimatedValue: number | null
  calcomBookingId: string | null
  calcomEventId: number | null
  appointmentTime: Timestamp | null
  bookingStatus: string | null
  bookingCancelledAt: Timestamp | null
  bookingCancelReason: string | null
  tags: unknown | null
  pipelineStage: Generated<string | null>
  pipelineStageId: string | null
}
export type TwilioConfig = {
  id: string
  organizationId: string
  accountSid: string | null
  authToken: string | null
  phoneNumber: string | null
  apiKeySid: string | null
  apiKeySecret: string | null
  twimlAppSid: string | null
  autoRecord: Generated<boolean>
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
}
export type User = {
  id: string
  createdAt: Generated<Timestamp>
  updatedAt: Generated<Timestamp>
  email: string
  emailVerified: Generated<boolean>
  name: string | null
  image: string | null
  permission: Generated<string>
  stripeCustomerId: string | null
  lastActiveOrganizationId: string | null
  isAdmin: Generated<boolean>
}
export type Verification = {
  id: string
  identifier: string
  value: string
  expiresAt: Timestamp
  createdAt: Generated<Timestamp>
  updatedAt: Generated<Timestamp>
}
export type DB = {
  account: Account
  agent: Agent
  call_disposition: CallDisposition
  call_log: CallLog
  example: Example
  invitation: Invitation
  lead: Lead
  member: Member
  organization: Organization
  pipeline_stage: PipelineStage
  recording: Recording
  session: Session
  subscription: Subscription
  task: Task
  task_instance: TaskInstance
  twilio_config: TwilioConfig
  user: User
  verification: Verification
}
