-- Batch 3: SMS sequencer

-- CreateTable
CREATE TABLE "sms_campaign" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "fromNumber" TEXT,
    "timezone" TEXT,
    "sendWindowStart" TEXT,
    "sendWindowEnd" TEXT,
    "dailySendLimit" INTEGER,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_campaign_step" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "messageTemplate" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_campaign_step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_campaign_list" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_campaign_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_campaign_enrollment" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "currentStepNumber" INTEGER NOT NULL DEFAULT 0,
    "nextSendAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_campaign_enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_campaign_message" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'outbound',
    "status" TEXT NOT NULL DEFAULT 'queued',
    "body" TEXT NOT NULL,
    "twilioMessageSid" TEXT,
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_campaign_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sms_campaign_step_campaignId_stepNumber_key" ON "sms_campaign_step"("campaignId", "stepNumber");

-- CreateIndex
CREATE UNIQUE INDEX "sms_campaign_list_campaignId_listId_key" ON "sms_campaign_list"("campaignId", "listId");

-- CreateIndex
CREATE UNIQUE INDEX "sms_campaign_enrollment_campaignId_leadId_key" ON "sms_campaign_enrollment"("campaignId", "leadId");

-- CreateIndex
CREATE UNIQUE INDEX "sms_campaign_message_twilioMessageSid_key" ON "sms_campaign_message"("twilioMessageSid");

-- AddForeignKey
ALTER TABLE "sms_campaign" ADD CONSTRAINT "sms_campaign_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_campaign" ADD CONSTRAINT "sms_campaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_campaign" ADD CONSTRAINT "sms_campaign_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_campaign_step" ADD CONSTRAINT "sms_campaign_step_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "sms_campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_campaign_list" ADD CONSTRAINT "sms_campaign_list_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "sms_campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_campaign_enrollment" ADD CONSTRAINT "sms_campaign_enrollment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "sms_campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_campaign_enrollment" ADD CONSTRAINT "sms_campaign_enrollment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_campaign_message" ADD CONSTRAINT "sms_campaign_message_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "sms_campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_campaign_message" ADD CONSTRAINT "sms_campaign_message_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "sms_campaign_enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_campaign_message" ADD CONSTRAINT "sms_campaign_message_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
