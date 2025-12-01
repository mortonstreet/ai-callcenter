/*
  Warnings:

  - You are about to drop the column `userId` on the `agent` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."agent" DROP CONSTRAINT "agent_userId_fkey";

-- AlterTable
ALTER TABLE "agent" DROP COLUMN "userId";
