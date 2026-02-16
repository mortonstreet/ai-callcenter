ALTER TABLE "organization"
ADD COLUMN "lifecycleStatus" TEXT NOT NULL DEFAULT 'workspace_active',
ADD COLUMN "planType" TEXT NOT NULL DEFAULT 'paid',
ADD COLUMN "provisioningStatus" TEXT NOT NULL DEFAULT 'completed',
ADD COLUMN "onboardingIdempotencyKey" TEXT,
ADD COLUMN "onboardingBusinessRole" TEXT,
ADD COLUMN "onboardingDemoIntent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "onboardingQualification" JSONB,
ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "organization_onboardingIdempotencyKey_key" ON "organization"("onboardingIdempotencyKey");

CREATE TABLE "onboarding_provisioning_job" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "lifecycleTarget" TEXT,
    "errorMessage" TEXT,
    "payload" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_provisioning_job_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "onboarding_provisioning_job_idempotencyKey_key" ON "onboarding_provisioning_job"("idempotencyKey");
CREATE INDEX "onboarding_provisioning_job_organizationId_createdAt_idx" ON "onboarding_provisioning_job"("organizationId", "createdAt");
CREATE INDEX "onboarding_provisioning_job_organizationId_status_createdAt_idx" ON "onboarding_provisioning_job"("organizationId", "status", "createdAt");
CREATE INDEX "onboarding_provisioning_job_correlationId_idx" ON "onboarding_provisioning_job"("correlationId");

CREATE TABLE "onboarding_provisioning_event" (
    "id" TEXT NOT NULL,
    "provisioningJobId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "eventType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_provisioning_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "onboarding_provisioning_event_provisioningJobId_createdAt_idx" ON "onboarding_provisioning_event"("provisioningJobId", "createdAt");
CREATE INDEX "onboarding_provisioning_event_organizationId_createdAt_idx" ON "onboarding_provisioning_event"("organizationId", "createdAt");
CREATE INDEX "onboarding_provisioning_event_correlationId_idx" ON "onboarding_provisioning_event"("correlationId");

ALTER TABLE "onboarding_provisioning_job" ADD CONSTRAINT "onboarding_provisioning_job_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "onboarding_provisioning_job" ADD CONSTRAINT "onboarding_provisioning_job_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "onboarding_provisioning_event" ADD CONSTRAINT "onboarding_provisioning_event_provisioningJobId_fkey" FOREIGN KEY ("provisioningJobId") REFERENCES "onboarding_provisioning_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "onboarding_provisioning_event" ADD CONSTRAINT "onboarding_provisioning_event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
