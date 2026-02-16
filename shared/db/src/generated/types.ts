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
export type AdminAuditLog = {
  id: string
  organizationId: string | null
  actorUserId: string | null
  action: string
  resourceType: string
  resourceId: string | null
  before: unknown | null
  after: unknown | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: Generated<Timestamp>
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
  industry: string | null
  useCase: string | null
  website: string | null
  mainGoal: string | null
  voiceId: string | null
  status: Generated<string>
  syncPending: Generated<boolean>
  lastSyncAt: Timestamp | null
  lastSyncError: string | null
  providerCorrelationKey: string | null
  mcpApiKey: string | null
  webhookSecret: string | null
  mcpEndpointUrl: string | null
}
export type AgentEmailConfig = {
  id: string
  agentId: string
  organizationId: string
  provider: string
  fromEmail: string | null
  fromName: string | null
  replyToEmail: string | null
  accessToken: string | null
  refreshToken: string | null
  tokenExpiresAt: Timestamp | null
  smtpHost: string | null
  smtpPort: number | null
  smtpSecure: boolean | null
  smtpUsername: string | null
  smtpPassword: string | null
  isEnabled: Generated<boolean>
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
}
export type AgentMessage = {
  id: string
  organizationId: string
  agentId: string
  leadId: string | null
  campaignId: string | null
  emailConfigId: string | null
  messageType: Generated<string>
  direction: Generated<string>
  status: Generated<string>
  subject: string | null
  body: string
  providerMessageId: string | null
  threadId: string | null
  metadata: unknown | null
  queuedAt: Generated<Timestamp>
  sentAt: Timestamp | null
  deliveredAt: Timestamp | null
  openedAt: Timestamp | null
  clickedAt: Timestamp | null
  failedAt: Timestamp | null
  errorMessage: string | null
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
}
export type AgentWorkflow = {
  id: string
  agentId: string
  organizationId: string
  name: string
  status: Generated<string>
  definition: unknown | null
  isDefault: Generated<boolean>
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
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
export type Campaign = {
  id: string
  organizationId: string
  name: string
  description: string | null
  channel: Generated<string>
  status: Generated<string>
  startAt: Timestamp | null
  endAt: Timestamp | null
  launchedAt: Timestamp | null
  archivedAt: Timestamp | null
  createdByUserId: string | null
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
}
export type CampaignLead = {
  id: string
  campaignId: string
  leadId: string
  organizationId: string
  status: Generated<string>
  enrolledAt: Generated<Timestamp>
  completedAt: Timestamp | null
  lastActivityAt: Timestamp | null
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
}
export type CampaignList = {
  id: string
  campaignId: string
  listId: string
  organizationId: string
  source: string | null
  filter: unknown | null
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
}
export type CampaignOrchestration = {
  id: string
  campaignId: string
  organizationId: string
  status: Generated<string>
  version: Generated<number>
  state: unknown | null
  activatedAt: Timestamp | null
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
}
export type CampaignUser = {
  id: string
  campaignId: string
  userId: string
  organizationId: string
  role: Generated<string>
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
}
export type ErrorLog = {
  id: string
  organizationId: string | null
  source: string
  severity: Generated<string>
  code: string | null
  message: string
  context: unknown | null
  resolvedAt: Timestamp | null
  resolvedByUserId: string | null
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
}
export type Example = {
  id: string
  name: string
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
}
export type Integration = {
  id: string
  organizationId: string
  provider: string
  status: Generated<string>
  displayName: string | null
  config: unknown | null
  accessToken: string | null
  refreshToken: string | null
  tokenExpiresAt: Timestamp | null
  scopes: string | null
  externalAccountId: string | null
  lastSyncAt: Timestamp | null
  lastSyncStatus: string | null
  lastSyncMessage: string | null
  createdByUserId: string | null
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
}
export type IntegrationSyncJob = {
  id: string
  integrationId: string
  organizationId: string
  provider: string
  jobType: Generated<string>
  status: Generated<string>
  startedAt: Timestamp | null
  completedAt: Timestamp | null
  lastCursor: string | null
  recordsSynced: Generated<number>
  errorMessage: string | null
  payload: unknown | null
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
}
export type IntegrationSyncLog = {
  id: string
  integrationId: string
  syncJobId: string | null
  organizationId: string
  level: Generated<string>
  message: string
  metadata: unknown | null
  createdAt: Generated<Timestamp>
}
export type IntegrationWebhookEvent = {
  id: string
  integrationId: string | null
  organizationId: string
  provider: string
  eventId: string
  eventType: string | null
  payload: unknown
  status: Generated<string>
  processedAt: Timestamp | null
  errorMessage: string | null
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
export type SmsCampaign = {
  id: string
  campaignId: string
  organizationId: string
  name: string
  status: Generated<string>
  fromNumber: string | null
  timezone: string | null
  sendWindowStart: string | null
  sendWindowEnd: string | null
  dailySendLimit: number | null
  createdByUserId: string | null
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
}
export type SmsCampaignEnrollment = {
  id: string
  campaignId: string
  leadId: string
  status: Generated<string>
  currentStepNumber: Generated<number>
  nextSendAt: Timestamp | null
  lastMessageAt: Timestamp | null
  completedAt: Timestamp | null
  errorMessage: string | null
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
}
export type SmsCampaignList = {
  id: string
  campaignId: string
  listId: string
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
}
export type SmsCampaignMessage = {
  id: string
  campaignId: string
  enrollmentId: string
  leadId: string
  stepNumber: number
  direction: Generated<string>
  status: Generated<string>
  body: string
  twilioMessageSid: string | null
  providerMessageId: string | null
  errorMessage: string | null
  queuedAt: Generated<Timestamp>
  sentAt: Timestamp | null
  deliveredAt: Timestamp | null
  failedAt: Timestamp | null
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
}
export type SmsCampaignStep = {
  id: string
  campaignId: string
  stepNumber: number
  delayMinutes: Generated<number>
  messageTemplate: string
  isActive: Generated<boolean>
  createdAt: Generated<Timestamp>
  updatedAt: Timestamp
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
  phoneNumberSid: string | null
  apiKeySid: string | null
  apiKeySecret: string | null
  twimlAppSid: string | null
  twilioSubaccountSid: string | null
  twilioSubaccountFriendlyName: string | null
  isIsvManaged: Generated<boolean>
  provisioningStatus: Generated<string>
  provisioningError: string | null
  provisioningAttemptCount: Generated<number>
  lastProvisioningAttemptAt: Timestamp | null
  provisionedAt: Timestamp | null
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
  admin_audit_log: AdminAuditLog
  agent: Agent
  agent_email_config: AgentEmailConfig
  agent_message: AgentMessage
  agent_workflow: AgentWorkflow
  call_disposition: CallDisposition
  call_log: CallLog
  campaign: Campaign
  campaign_lead: CampaignLead
  campaign_list: CampaignList
  campaign_orchestration: CampaignOrchestration
  campaign_user: CampaignUser
  error_log: ErrorLog
  example: Example
  integration: Integration
  integration_sync_job: IntegrationSyncJob
  integration_sync_log: IntegrationSyncLog
  integration_webhook_event: IntegrationWebhookEvent
  invitation: Invitation
  lead: Lead
  member: Member
  organization: Organization
  pipeline_stage: PipelineStage
  recording: Recording
  session: Session
  sms_campaign: SmsCampaign
  sms_campaign_enrollment: SmsCampaignEnrollment
  sms_campaign_list: SmsCampaignList
  sms_campaign_message: SmsCampaignMessage
  sms_campaign_step: SmsCampaignStep
  subscription: Subscription
  task: Task
  task_instance: TaskInstance
  twilio_config: TwilioConfig
  user: User
  verification: Verification
}
