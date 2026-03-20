-- Repair migration for environments where agent profile columns were not
-- materialized on the "agent" table.

ALTER TABLE "agent"
ADD COLUMN IF NOT EXISTS "industry" TEXT,
ADD COLUMN IF NOT EXISTS "useCase" TEXT,
ADD COLUMN IF NOT EXISTS "website" TEXT,
ADD COLUMN IF NOT EXISTS "mainGoal" TEXT,
ADD COLUMN IF NOT EXISTS "voiceId" TEXT,
ADD COLUMN IF NOT EXISTS "status" TEXT;

UPDATE "agent"
SET "status" = 'draft'
WHERE "status" IS NULL;

ALTER TABLE "agent"
ALTER COLUMN "status" SET DEFAULT 'draft';

ALTER TABLE "agent"
ALTER COLUMN "status" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "agent_status_idx" ON "agent"("status");
