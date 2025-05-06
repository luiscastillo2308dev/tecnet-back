/*
  Warnings:

  - You are about to drop the column `filePath` on the `quote_requests` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "quote_requests" DROP COLUMN "filePath",
ADD COLUMN     "requirementsFile" TEXT;
