-- Repair migration for environments where wizard provisioning migrations were
-- recorded as applied but required schema objects are missing.

ALTER TABLE "agent"
ADD COLUMN IF NOT EXISTS "promptProfileVersion" TEXT,
ADD COLUMN IF NOT EXISTS "configProfileVersion" TEXT,
ADD COLUMN IF NOT EXISTS "profileHash" TEXT,
ADD COLUMN IF NOT EXISTS "wizardIntentProfile" JSONB,
ADD COLUMN IF NOT EXISTS "readinessStatus" TEXT NOT NULL DEFAULT 'blocked',
ADD COLUMN IF NOT EXISTS "provisioningState" TEXT NOT NULL DEFAULT 'queued';

ALTER TABLE "agent"
ALTER COLUMN "readinessStatus" SET DEFAULT 'blocked';

ALTER TABLE "agent"
ALTER COLUMN "provisioningState" SET DEFAULT 'queued';

CREATE INDEX IF NOT EXISTS "agent_readinessStatus_idx" ON "agent"("readinessStatus");

CREATE TABLE IF NOT EXISTS "agent_provisioning_job" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "requestedByUserId" TEXT,
  "correlationId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "readinessStatus" TEXT,
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

CREATE TABLE IF NOT EXISTS "agent_provisioning_step" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "stepId" TEXT NOT NULL,
  "stepOrder" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "blocking" BOOLEAN NOT NULL DEFAULT true,
  "message" TEXT,
  "remediationAction" TEXT,
  "attempt" INTEGER NOT NULL DEFAULT 1,
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

ALTER TABLE "agent_provisioning_job"
ADD COLUMN IF NOT EXISTS "readinessStatus" TEXT;

ALTER TABLE "agent_provisioning_step"
ADD COLUMN IF NOT EXISTS "blocking" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "message" TEXT,
ADD COLUMN IF NOT EXISTS "remediationAction" TEXT;

ALTER TABLE "agent_provisioning_step"
ALTER COLUMN "attempt" SET DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS "agent_provisioning_job_organizationId_idempotencyKey_key"
ON "agent_provisioning_job"("organizationId", "idempotencyKey");

CREATE INDEX IF NOT EXISTS "agent_provisioning_job_organizationId_status_createdAt_idx"
ON "agent_provisioning_job"("organizationId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "agent_provisioning_job_organizationId_agentId_createdAt_idx"
ON "agent_provisioning_job"("organizationId", "agentId", "createdAt");

CREATE INDEX IF NOT EXISTS "agent_provisioning_job_idempotencyKey_idx"
ON "agent_provisioning_job"("idempotencyKey");

CREATE INDEX IF NOT EXISTS "agent_provisioning_job_correlationId_idx"
ON "agent_provisioning_job"("correlationId");

CREATE UNIQUE INDEX IF NOT EXISTS "agent_provisioning_step_jobId_stepId_key"
ON "agent_provisioning_step"("jobId", "stepId");

CREATE INDEX IF NOT EXISTS "agent_provisioning_step_organizationId_status_createdAt_idx"
ON "agent_provisioning_step"("organizationId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "agent_provisioning_step_organizationId_agentId_stepOrder_idx"
ON "agent_provisioning_step"("organizationId", "agentId", "stepOrder");

CREATE INDEX IF NOT EXISTS "agent_provisioning_step_jobId_stepOrder_idx"
ON "agent_provisioning_step"("jobId", "stepOrder");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agent_provisioning_job_organizationId_fkey'
  ) THEN
    ALTER TABLE "agent_provisioning_job"
    ADD CONSTRAINT "agent_provisioning_job_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agent_provisioning_job_agentId_fkey'
  ) THEN
    ALTER TABLE "agent_provisioning_job"
    ADD CONSTRAINT "agent_provisioning_job_agentId_fkey"
    FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agent_provisioning_job_requestedByUserId_fkey'
  ) THEN
    ALTER TABLE "agent_provisioning_job"
    ADD CONSTRAINT "agent_provisioning_job_requestedByUserId_fkey"
    FOREIGN KEY ("requestedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agent_provisioning_step_jobId_fkey'
  ) THEN
    ALTER TABLE "agent_provisioning_step"
    ADD CONSTRAINT "agent_provisioning_step_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "agent_provisioning_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agent_provisioning_step_organizationId_fkey'
  ) THEN
    ALTER TABLE "agent_provisioning_step"
    ADD CONSTRAINT "agent_provisioning_step_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agent_provisioning_step_agentId_fkey'
  ) THEN
    ALTER TABLE "agent_provisioning_step"
    ADD CONSTRAINT "agent_provisioning_step_agentId_fkey"
    FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
