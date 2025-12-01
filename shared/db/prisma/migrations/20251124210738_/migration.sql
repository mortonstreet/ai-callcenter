/*
  Warnings:

  - Added the required column `payload` to the `recording` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "recording" ADD COLUMN     "payload" JSONB NOT NULL;
