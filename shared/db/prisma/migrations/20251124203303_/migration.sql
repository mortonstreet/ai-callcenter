-- AlterTable
ALTER TABLE "task" ADD COLUMN     "dispatcherUserId" TEXT;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_dispatcherUserId_fkey" FOREIGN KEY ("dispatcherUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
