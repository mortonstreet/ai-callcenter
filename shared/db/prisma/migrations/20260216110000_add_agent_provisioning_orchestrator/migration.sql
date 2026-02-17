ALTER TABLE "agent"
ADD COLUMN IF NOT EXISTS "promptProfileVersion" TEXT,
ADD COLUMN IF NOT EXISTS "configProfileVersion" TEXT,
ADD COLUMN IF NOT EXISTS "profileHash" TEXT,
ADD COLUMN IF NOT EXISTS "wizardIntentProfile" JSONB,
ADD COLUMN IF NOT EXISTS "readinessStatus" TEXT NOT NULL DEFAULT 'degraded';

CREATE INDEX IF NOT EXISTS "agent_readinessStatus_idx" ON "agent"("readinessStatus");

CREATE TABLE "agent_provisioning_job" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "requestedByUserId" TEXT,
  "correlationId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "attempt" INTEGER NOT NULL DEFAULT 1,
  "lastErrorCode" TEXT,
  "lastErrorMessage" TEXT,
  "wizardInput" JSONB NOT NULL,
  "intentProfile" JSONB,
  "runtimeState" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "agent_provisioning_job_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_provisioning_step" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "stepId" TEXT NOT NULL,
  "stepOrder" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "correlationId" TEXT NOT NULL,
  "lastErrorCode" TEXT,
  "lastErrorMessage" TEXT,
  "eventLog" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "agent_provisioning_step_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agent_provisioning_job_requestedByUserId_idempotencyKey_key" ON "agent_provisioning_job"("requestedByUserId", "idempotencyKey");
CREATE INDEX "agent_provisioning_job_organizationId_status_createdAt_idx" ON "agent_provisioning_job"("organizationId", "status", "createdAt");
CREATE INDEX "agent_provisioning_job_agentId_createdAt_idx" ON "agent_provisioning_job"("agentId", "createdAt");
CREATE INDEX "agent_provisioning_job_idempotencyKey_idx" ON "agent_provisioning_job"("idempotencyKey");

CREATE UNIQUE INDEX "agent_provisioning_step_jobId_stepId_key" ON "agent_provisioning_step"("jobId", "stepId");
CREATE INDEX "agent_provisioning_step_organizationId_status_stepOrder_idx" ON "agent_provisioning_step"("organizationId", "status", "stepOrder");
CREATE INDEX "agent_provisioning_step_agentId_createdAt_idx" ON "agent_provisioning_step"("agentId", "createdAt");

ALTER TABLE "agent_provisioning_job"
ADD CONSTRAINT "agent_provisioning_job_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_provisioning_job"
ADD CONSTRAINT "agent_provisioning_job_agentId_fkey"
FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_provisioning_job"
ADD CONSTRAINT "agent_provisioning_job_requestedByUserId_fkey"
FOREIGN KEY ("requestedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "agent_provisioning_step"
ADD CONSTRAINT "agent_provisioning_step_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "agent_provisioning_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_provisioning_step"
ADD CONSTRAINT "agent_provisioning_step_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_provisioning_step"
ADD CONSTRAINT "agent_provisioning_step_agentId_fkey"
FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
