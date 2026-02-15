ALTER TABLE "agent"
ADD COLUMN "syncPending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lastSyncAt" TIMESTAMP(3),
ADD COLUMN "lastSyncError" TEXT,
ADD COLUMN "providerCorrelationKey" TEXT;

ALTER TABLE "agent"
ALTER COLUMN "status" SET DEFAULT 'draft';

CREATE INDEX IF NOT EXISTS "agent_status_idx" ON "agent"("status");
CREATE INDEX IF NOT EXISTS "agent_syncPending_idx" ON "agent"("syncPending");
CREATE INDEX IF NOT EXISTS "agent_providerCorrelationKey_idx" ON "agent"("providerCorrelationKey");
