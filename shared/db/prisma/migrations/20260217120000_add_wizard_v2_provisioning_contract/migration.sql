ALTER TABLE "agent"
ADD COLUMN IF NOT EXISTS "provisioningState" TEXT NOT NULL DEFAULT 'queued';

ALTER TABLE "agent_provisioning_job"
ADD COLUMN IF NOT EXISTS "readinessStatus" TEXT;

ALTER TABLE "agent_provisioning_step"
ADD COLUMN IF NOT EXISTS "blocking" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "message" TEXT,
ADD COLUMN IF NOT EXISTS "remediationAction" TEXT;
