-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "quote_requests" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "filePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "QuoteStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "quote_requests_pkey" PRIMARY KEY ("id")
);
