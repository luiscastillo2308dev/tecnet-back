/*
  Warnings:

  - Added the required column `updatedAt` to the `quote_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "quote_requests" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
