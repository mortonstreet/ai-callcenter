/*
  Warnings:

  - Made the column `requiredInfo` on table `task_instance` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "task_instance" ALTER COLUMN "requiredInfo" SET NOT NULL;
