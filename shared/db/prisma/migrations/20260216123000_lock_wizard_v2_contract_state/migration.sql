ALTER TABLE "agent"
ALTER COLUMN "readinessStatus" SET DEFAULT 'blocked';

ALTER TABLE "agent_provisioning_step"
ALTER COLUMN "attempt" SET DEFAULT 1;

DROP INDEX IF EXISTS "agent_provisioning_job_requestedByUserId_idempotencyKey_key";
DROP INDEX IF EXISTS "agent_provisioning_job_agentId_createdAt_idx";
DROP INDEX IF EXISTS "agent_provisioning_step_organizationId_status_stepOrder_idx";
DROP INDEX IF EXISTS "agent_provisioning_step_agentId_createdAt_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "agent_provisioning_job_organizationId_idempotencyKey_key"
ON "agent_provisioning_job"("organizationId", "idempotencyKey");

CREATE INDEX IF NOT EXISTS "agent_provisioning_job_organizationId_agentId_createdAt_idx"
ON "agent_provisioning_job"("organizationId", "agentId", "createdAt");

CREATE INDEX IF NOT EXISTS "agent_provisioning_job_correlationId_idx"
ON "agent_provisioning_job"("correlationId");

CREATE INDEX IF NOT EXISTS "agent_provisioning_step_organizationId_status_createdAt_idx"
ON "agent_provisioning_step"("organizationId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "agent_provisioning_step_organizationId_agentId_stepOrder_idx"
ON "agent_provisioning_step"("organizationId", "agentId", "stepOrder");

CREATE INDEX IF NOT EXISTS "agent_provisioning_step_jobId_stepOrder_idx"
ON "agent_provisioning_step"("jobId", "stepOrder");
