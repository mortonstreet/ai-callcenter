-- S6: ElevenLabs advanced provisioning persistence
ALTER TABLE "organization"
ADD COLUMN "provisionedVoiceId" TEXT,
ADD COLUMN "voiceProvisioningStatus" TEXT NOT NULL DEFAULT 'not_started',
ADD COLUMN "voiceTrainingStatus" TEXT NOT NULL DEFAULT 'not_requested',
ADD COLUMN "voiceProvisioningError" TEXT,
ADD COLUMN "voicePromptSeed" TEXT,
ADD COLUMN "voiceProvisionedAt" TIMESTAMP(3);

ALTER TABLE "agent"
ADD COLUMN "voiceProvisioningStatus" TEXT NOT NULL DEFAULT 'not_started',
ADD COLUMN "voicePromptSeed" TEXT;
