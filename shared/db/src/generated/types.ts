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
export type Example = {
  id: string
  name: string
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
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
  example: Example
  invitation: Invitation
  member: Member
  organization: Organization
  recording: Recording
  session: Session
  subscription: Subscription
  task: Task
  task_instance: TaskInstance
  user: User
  verification: Verification
}
