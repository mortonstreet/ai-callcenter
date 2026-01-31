-- CreateTable
CREATE TABLE "lead" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "normalizedPhone" TEXT,
    "company" TEXT,
    "title" TEXT,
    "linkedInUrl" TEXT,
    "website" TEXT,
    "customFields" JSONB,
    "pipelineStageId" TEXT,
    "dealValue" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "lead_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "lead" ADD CONSTRAINT "lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead" ADD CONSTRAINT "lead_pipelineStageId_fkey" FOREIGN KEY ("pipelineStageId") REFERENCES "pipeline_stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
