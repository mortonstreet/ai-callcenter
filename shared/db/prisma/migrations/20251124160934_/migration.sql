/*
  Warnings:

  - Added the required column `conversationId` to the `task_instance` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "task_instance" ADD COLUMN     "callSid" TEXT,
ADD COLUMN     "conversationId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "recording" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "callSid" TEXT NOT NULL,
    "taskInstanceId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recording_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "recording" ADD CONSTRAINT "recording_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recording" ADD CONSTRAINT "recording_taskInstanceId_fkey" FOREIGN KEY ("taskInstanceId") REFERENCES "task_instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
