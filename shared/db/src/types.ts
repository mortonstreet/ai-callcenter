import { Selectable, Insertable, Updateable } from "kysely";
import {
  AdminAuditLog,
  AgentEmailConfig,
  AgentMessage,
  AgentWorkflow,
  Campaign,
  CampaignLead,
  CampaignList,
  CampaignOrchestration,
  CampaignUser,
  User,
  Example,
  Organization,
  Session,
  Account,
  Agent,
  Task,
  TaskInstance,
  Recording,
  Invitation,
  PipelineStage,
  TwilioConfig,
  CallDisposition,
  CallLog,
  Lead,
  ErrorLog,
  Integration,
  IntegrationSyncJob,
  IntegrationSyncLog,
  IntegrationWebhookEvent,
  SmsCampaign,
  SmsCampaignEnrollment,
  SmsCampaignList,
  SmsCampaignMessage,
  SmsCampaignStep,
} from "./generated/types";


export type DBUser = Selectable<User>;
export type UpdateDBUser = Updateable<User>;
export type InsertDBUser = Insertable<User>;

export type DBAccount = Selectable<Account>;
export type UpdateDBAccount = Updateable<Account>;
export type InsertDBAccount = Insertable<Account>;

export type DBSession = Selectable<Session>;
export type UpdateDBSession = Updateable<Session>;
export type InsertDBSession = Insertable<Session>;

export type DBOrganization = Selectable<Organization>;
export type InsertDBOrganization = Insertable<Organization>;
export type UpdateDBOrganization = Updateable<Organization>;

export type DBInvitation = Selectable<Invitation>;
export type InsertDBInvitation = Insertable<Invitation>;
export type UpdateDBInvitation = Updateable<Invitation>;

export type DBExample = Selectable<Example>;
export type UpdateDBExample = Updateable<Example>;
export type InsertDBExample = Insertable<Example>;

export type DBAgent = Selectable<Agent>;
export type UpdateDBAgent = Updateable<Agent>;
export type InsertDBAgent = Insertable<Agent>;

export type DBTask = Selectable<Task>;
export type UpdateDBTask = Updateable<Task>;
export type InsertDBTask = Insertable<Task>;

export type DBTaskInstance = Selectable<TaskInstance>;
export type UpdateDBTaskInstance = Updateable<TaskInstance>;
export type InsertDBTaskInstance = Insertable<TaskInstance>;

export type DBRecording = Selectable<Recording>;
export type UpdateDBRecording = Updateable<Recording>;
export type InsertDBRecording = Insertable<Recording>;

export type DBPipelineStage = Selectable<PipelineStage>;
export type UpdateDBPipelineStage = Updateable<PipelineStage>;
export type InsertDBPipelineStage = Insertable<PipelineStage>;

export type DBTwilioConfig = Selectable<TwilioConfig>;
export type InsertDBTwilioConfig = Insertable<TwilioConfig>;
export type UpdateDBTwilioConfig = Updateable<TwilioConfig>;

export type DBCallDisposition = Selectable<CallDisposition>;
export type InsertDBCallDisposition = Insertable<CallDisposition>;
export type UpdateDBCallDisposition = Updateable<CallDisposition>;

export type DBCallLog = Selectable<CallLog>;
export type InsertDBCallLog = Insertable<CallLog>;
export type UpdateDBCallLog = Updateable<CallLog>;

export type DBLead = Selectable<Lead>;
export type InsertDBLead = Insertable<Lead>;
export type UpdateDBLead = Updateable<Lead>;

export type DBIntegration = Selectable<Integration>;
export type InsertDBIntegration = Insertable<Integration>;
export type UpdateDBIntegration = Updateable<Integration>;

export type DBIntegrationSyncJob = Selectable<IntegrationSyncJob>;
export type InsertDBIntegrationSyncJob = Insertable<IntegrationSyncJob>;
export type UpdateDBIntegrationSyncJob = Updateable<IntegrationSyncJob>;

export type DBIntegrationSyncLog = Selectable<IntegrationSyncLog>;
export type InsertDBIntegrationSyncLog = Insertable<IntegrationSyncLog>;
export type UpdateDBIntegrationSyncLog = Updateable<IntegrationSyncLog>;

export type DBIntegrationWebhookEvent = Selectable<IntegrationWebhookEvent>;
export type InsertDBIntegrationWebhookEvent = Insertable<IntegrationWebhookEvent>;
export type UpdateDBIntegrationWebhookEvent = Updateable<IntegrationWebhookEvent>;

export type DBCampaign = Selectable<Campaign>;
export type InsertDBCampaign = Insertable<Campaign>;
export type UpdateDBCampaign = Updateable<Campaign>;

export type DBCampaignLead = Selectable<CampaignLead>;
export type InsertDBCampaignLead = Insertable<CampaignLead>;
export type UpdateDBCampaignLead = Updateable<CampaignLead>;

export type DBCampaignUser = Selectable<CampaignUser>;
export type InsertDBCampaignUser = Insertable<CampaignUser>;
export type UpdateDBCampaignUser = Updateable<CampaignUser>;

export type DBCampaignList = Selectable<CampaignList>;
export type InsertDBCampaignList = Insertable<CampaignList>;
export type UpdateDBCampaignList = Updateable<CampaignList>;

export type DBCampaignOrchestration = Selectable<CampaignOrchestration>;
export type InsertDBCampaignOrchestration = Insertable<CampaignOrchestration>;
export type UpdateDBCampaignOrchestration = Updateable<CampaignOrchestration>;

export type DBSmsCampaign = Selectable<SmsCampaign>;
export type InsertDBSmsCampaign = Insertable<SmsCampaign>;
export type UpdateDBSmsCampaign = Updateable<SmsCampaign>;

export type DBSmsCampaignStep = Selectable<SmsCampaignStep>;
export type InsertDBSmsCampaignStep = Insertable<SmsCampaignStep>;
export type UpdateDBSmsCampaignStep = Updateable<SmsCampaignStep>;

export type DBSmsCampaignList = Selectable<SmsCampaignList>;
export type InsertDBSmsCampaignList = Insertable<SmsCampaignList>;
export type UpdateDBSmsCampaignList = Updateable<SmsCampaignList>;

export type DBSmsCampaignEnrollment = Selectable<SmsCampaignEnrollment>;
export type InsertDBSmsCampaignEnrollment = Insertable<SmsCampaignEnrollment>;
export type UpdateDBSmsCampaignEnrollment = Updateable<SmsCampaignEnrollment>;

export type DBSmsCampaignMessage = Selectable<SmsCampaignMessage>;
export type InsertDBSmsCampaignMessage = Insertable<SmsCampaignMessage>;
export type UpdateDBSmsCampaignMessage = Updateable<SmsCampaignMessage>;

export type DBAgentEmailConfig = Selectable<AgentEmailConfig>;
export type InsertDBAgentEmailConfig = Insertable<AgentEmailConfig>;
export type UpdateDBAgentEmailConfig = Updateable<AgentEmailConfig>;

export type DBAgentMessage = Selectable<AgentMessage>;
export type InsertDBAgentMessage = Insertable<AgentMessage>;
export type UpdateDBAgentMessage = Updateable<AgentMessage>;

export type DBAgentWorkflow = Selectable<AgentWorkflow>;
export type InsertDBAgentWorkflow = Insertable<AgentWorkflow>;
export type UpdateDBAgentWorkflow = Updateable<AgentWorkflow>;

export type DBErrorLog = Selectable<ErrorLog>;
export type InsertDBErrorLog = Insertable<ErrorLog>;
export type UpdateDBErrorLog = Updateable<ErrorLog>;

export type DBAdminAuditLog = Selectable<AdminAuditLog>;
export type InsertDBAdminAuditLog = Insertable<AdminAuditLog>;
export type UpdateDBAdminAuditLog = Updateable<AdminAuditLog>;

export type DBPagination = {
  page: number;
  limit: number;
  offset: number;
};
