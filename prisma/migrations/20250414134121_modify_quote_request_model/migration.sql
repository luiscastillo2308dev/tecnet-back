/*
  Warnings:

  - The primary key for the `quote_requests` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "quote_requests" DROP CONSTRAINT "quote_requests_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "quote_requests_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "quote_requests_id_seq";
