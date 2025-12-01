/*
  Warnings:

  - Added the required column `callDurationSeconds` to the `recording` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cost` to the `recording` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "recording" ADD COLUMN     "callDurationSeconds" INTEGER NOT NULL,
ADD COLUMN     "cost" DOUBLE PRECISION NOT NULL;
