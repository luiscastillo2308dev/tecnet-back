/*
  Warnings:

  - Added the required column `subject` to the `quote_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "quote_requests" ADD COLUMN     "subject" TEXT NOT NULL;
