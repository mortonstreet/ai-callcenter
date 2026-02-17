-- Batch 5: Performance indexes and stricter post-backfill constraints

-- CreateIndex
CREATE INDEX "integration_organizationId_status_idx" ON "integration"("organizationId", "status");

-- CreateIndex
CREATE INDEX "integration_lastSyncAt_idx" ON "integration"("lastSyncAt");

-- CreateIndex
CREATE INDEX "integration_sync_job_integrationId_createdAt_idx" ON "integration_sync_job"("integrationId", "createdAt");

-- CreateIndex
CREATE INDEX "integration_sync_job_organizationId_status_createdAt_idx" ON "integration_sync_job"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "integration_sync_log_integrationId_createdAt_idx" ON "integration_sync_log"("integrationId", "createdAt");

-- CreateIndex
CREATE INDEX "integration_sync_log_syncJobId_idx" ON "integration_sync_log"("syncJobId");

-- CreateIndex
CREATE INDEX "integration_sync_log_organizationId_createdAt_idx" ON "integration_sync_log"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "integration_webhook_event_organizationId_createdAt_idx" ON "integration_webhook_event"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "integration_webhook_event_status_createdAt_idx" ON "integration_webhook_event"("status", "createdAt");

-- CreateIndex
CREATE INDEX "campaign_organizationId_status_startAt_endAt_idx" ON "campaign"("organizationId", "status", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "campaign_organizationId_archivedAt_idx" ON "campaign"("organizationId", "archivedAt");

-- CreateIndex
CREATE INDEX "campaign_lead_organizationId_status_idx" ON "campaign_lead"("organizationId", "status");

-- CreateIndex
CREATE INDEX "campaign_lead_lastActivityAt_idx" ON "campaign_lead"("lastActivityAt");

-- CreateIndex
CREATE INDEX "campaign_user_organizationId_role_idx" ON "campaign_user"("organizationId", "role");

-- CreateIndex
CREATE INDEX "campaign_list_organizationId_idx" ON "campaign_list"("organizationId");

-- CreateIndex
CREATE INDEX "campaign_orchestration_organizationId_status_idx" ON "campaign_orchestration"("organizationId", "status");

-- CreateIndex
CREATE INDEX "sms_campaign_organizationId_status_idx" ON "sms_campaign"("organizationId", "status");

-- CreateIndex
CREATE INDEX "sms_campaign_step_campaignId_isActive_idx" ON "sms_campaign_step"("campaignId", "isActive");

-- CreateIndex
CREATE INDEX "sms_campaign_enrollment_status_nextSendAt_idx" ON "sms_campaign_enrollment"("status", "nextSendAt");

-- CreateIndex
CREATE INDEX "sms_campaign_enrollment_campaignId_currentStepNumber_idx" ON "sms_campaign_enrollment"("campaignId", "currentStepNumber");

-- CreateIndex
CREATE INDEX "sms_campaign_message_campaignId_status_idx" ON "sms_campaign_message"("campaignId", "status");

-- CreateIndex
CREATE INDEX "sms_campaign_message_leadId_createdAt_idx" ON "sms_campaign_message"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "sms_campaign_message_enrollmentId_createdAt_idx" ON "sms_campaign_message"("enrollmentId", "createdAt");

-- CreateIndex
CREATE INDEX "agent_email_config_organizationId_provider_idx" ON "agent_email_config"("organizationId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "agent_message_providerMessageId_key" ON "agent_message"("providerMessageId");

-- CreateIndex
CREATE INDEX "agent_message_agentId_idx" ON "agent_message"("agentId");

-- CreateIndex
CREATE INDEX "agent_message_leadId_idx" ON "agent_message"("leadId");

-- CreateIndex
CREATE INDEX "agent_message_status_idx" ON "agent_message"("status");

-- CreateIndex
CREATE INDEX "agent_message_messageType_idx" ON "agent_message"("messageType");

-- CreateIndex
CREATE INDEX "agent_message_direction_idx" ON "agent_message"("direction");

-- CreateIndex
CREATE INDEX "agent_workflow_organizationId_status_idx" ON "agent_workflow"("organizationId", "status");

-- CreateIndex
CREATE INDEX "error_log_organizationId_createdAt_idx" ON "error_log"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "error_log_severity_createdAt_idx" ON "error_log"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "error_log_source_createdAt_idx" ON "error_log"("source", "createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_log_organizationId_createdAt_idx" ON "admin_audit_log"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_log_actorUserId_createdAt_idx" ON "admin_audit_log"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_log_resourceType_resourceId_idx" ON "admin_audit_log"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "admin_audit_log_action_createdAt_idx" ON "admin_audit_log"("action", "createdAt");
