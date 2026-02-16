ALTER TABLE "twilio_config"
  ADD COLUMN IF NOT EXISTS "phoneNumberSid" TEXT,
  ADD COLUMN IF NOT EXISTS "twilioSubaccountSid" TEXT,
  ADD COLUMN IF NOT EXISTS "twilioSubaccountFriendlyName" TEXT,
  ADD COLUMN IF NOT EXISTS "isIsvManaged" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "provisioningStatus" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "provisioningError" TEXT,
  ADD COLUMN IF NOT EXISTS "provisioningAttemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastProvisioningAttemptAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "provisionedAt" TIMESTAMP(3);

UPDATE "twilio_config"
SET
  "provisioningStatus" = COALESCE("provisioningStatus", 'pending'),
  "provisioningAttemptCount" = COALESCE("provisioningAttemptCount", 0),
  "isIsvManaged" = COALESCE("isIsvManaged", false);
