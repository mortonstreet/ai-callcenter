-- CreateTable
CREATE TABLE "pipeline_stage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pipeline_stage_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "task_instance" ADD COLUMN "pipelineStageId" TEXT;

-- AddForeignKey
ALTER TABLE "pipeline_stage" ADD CONSTRAINT "pipeline_stage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_instance" ADD CONSTRAINT "task_instance_pipelineStageId_fkey" FOREIGN KEY ("pipelineStageId") REFERENCES "pipeline_stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
