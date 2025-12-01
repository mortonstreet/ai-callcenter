/*
  Warnings:

  - Added the required column `externalId` to the `agent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `externalType` to the `agent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "agent" ADD COLUMN     "externalId" TEXT NOT NULL,
ADD COLUMN     "externalType" TEXT NOT NULL;
