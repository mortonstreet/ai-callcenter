-- AlterTable
ALTER TABLE "task_instance" ADD COLUMN "leadId" TEXT;

-- AddForeignKey
ALTER TABLE "task_instance" ADD CONSTRAINT "task_instance_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
