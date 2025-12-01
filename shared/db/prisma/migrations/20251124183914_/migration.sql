-- AlterTable
ALTER TABLE "task" ADD COLUMN     "agentId" TEXT;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
