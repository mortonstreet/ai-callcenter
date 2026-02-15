# V1 Subspec: Data Model And Migration Plan

Status: Draft v1
Owner: Data platform engineering
Parent: `specs/v1/master-v1-spec.md`

Git Delivery Branch: `feature/data-model-and-migration-plan`
Subspec Completion Gate:
1. Start implementation with `git switch -c feature/data-model-and-migration-plan` from the current base branch.
2. Keep all code, tests, and docs for this subspec on `feature/data-model-and-migration-plan`.
3. Create at least one intentional commit that references this subspec scope.
4. Push the branch to GitHub with `git push -u origin feature/data-model-and-migration-plan`.
5. Do not mark this subspec complete until the implementation commit is present on `feature/data-model-and-migration-plan` in GitHub.

## 1. Purpose

Define the database changes required to deliver auth migration, integrations, multichannel campaigns, and operational readiness without destabilizing existing Revcenter production paths.

## 2. Current Revcenter Schema Summary

Present core tables include:

1. auth entities (`user`, `session`, `account`, `verification`).
2. org membership (`organization`, `member`, `invitation`).
3. AI agent entities (`agent`, `task`, `task_instance`, `recording`).
4. call and lead entities (`twilio_config`, `call_log`, `call_disposition`, `lead`, `pipeline_stage`).

Missing for v1 goals:

1. integration credential/config tables.
2. campaign orchestration tables.
3. SMS sequencer tables.
4. outbound email message tracking tables.
5. sync job observability tables.

## 3. New Table Groups

### 3.1 Integrations

1. `integration`
2. `integration_sync_job`
3. `integration_sync_log`
4. optional: `integration_webhook_event` (idempotency/audit)

### 3.2 Campaigns Core

1. `campaign`
2. `campaign_lead`
3. `campaign_user`
4. `campaign_list`
5. optional: `campaign_orchestration`

### 3.3 SMS Sequencer

1. `sms_campaign`
2. `sms_campaign_step`
3. `sms_campaign_list`
4. `sms_campaign_enrollment`
5. `sms_campaign_message`

### 3.4 Email Outreach

1. `agent_email_config`
2. `agent_message`
3. optional: `agent_workflow` for advanced sequence orchestration

### 3.5 Governance And Reliability

1. `error_log` (platform/admin visibility)
2. `admin_audit_log` (credential/config changes)

## 4. Column And Index Requirements

### 4.1 Integrations

1. Unique index on `(organizationId, provider)`.
2. Index on `lastSyncAt` for stale-sync reporting.
3. Token columns encrypted and nullable for config-only providers.

### 4.2 Campaigns

1. `campaign_lead`: unique `(campaignId, leadId)`.
2. `campaign_user`: unique `(campaignId, userId)`.
3. `campaign_list`: unique `(campaignId, listId)`.
4. Index on campaign activity fields for active/inactive filtering.

### 4.3 SMS

1. `sms_campaign_step`: unique `(campaignId, stepNumber)`.
2. `sms_campaign_enrollment`: unique `(campaignId, leadId)`.
3. Index on `(status, nextSendAt)` for worker readiness queries.
4. `twilioMessageSid` unique on `sms_campaign_message`.

### 4.4 Email

1. `agent_email_config`: unique `agentId`.
2. `agent_message`: indices on `agentId`, `leadId`, `status`, `messageType`, `direction`.
3. Optional unique index on provider message IDs where available.

## 5. Migration Batching Strategy

### Batch 1: Safe additive foundations

1. Integrations tables.
2. Error/audit tables.

### Batch 2: Campaign and list linkage

1. Campaign core tables.
2. Campaign-list and campaign-lead joins.

### Batch 3: SMS sequencer

1. SMS campaign tables.
2. Enrollment and message tables.

### Batch 4: Email outreach

1. Agent email config and message tables.
2. Workflow support tables if enabled.

### Batch 5: Performance indexes and constraints

1. Add non-blocking indexes.
2. Add stricter constraints once backfills complete.

## 6. Backfill And Compatibility

1. Existing `lead` rows require no destructive changes.
2. Existing `agent` rows backfilled with default outreach settings where needed.
3. Maintain backward compatibility for current agent/task endpoints while new campaign modules ship.
4. Delay any destructive column drops to post-GA cleanup migration.

## 7. Rollback Rules

1. Migrations must be additive and reversible in stage/prod release windows.
2. If app rollback is needed, schema must remain readable by previous app version.
3. For failed batch rollout:
- disable feature flags.
- halt worker processing for dependent tables.
- re-run app with previous release image.

## 8. Data Ownership And Retention

1. Message/campaign history retained for minimum 12 months (default).
2. Audit logs retained minimum 18 months.
3. PII data exports follow org-level authorization and logging.

## 9. ORM/Type Layer Changes

1. Update `shared/db/prisma/schema.prisma` in migration batches.
2. Regenerate DB types (`prisma-kysely` + Prisma client).
3. Add shared request/response contracts in `shared/types/src/requests/*`.
4. Ensure backend repositories map one-to-one with new tables.

## 10. Acceptance Criteria

1. All migration batches apply cleanly in stage.
2. Existing Revcenter features remain functional after each batch.
3. New campaign and integration queries meet p95 target under expected load.
4. Rollback rehearsal completed before production rollout.
