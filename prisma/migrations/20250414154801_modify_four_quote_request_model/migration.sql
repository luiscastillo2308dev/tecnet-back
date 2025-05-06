/*
  Warnings:

  - Made the column `requirementsFile` on table `quote_requests` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "quote_requests" ALTER COLUMN "requirementsFile" SET NOT NULL;
