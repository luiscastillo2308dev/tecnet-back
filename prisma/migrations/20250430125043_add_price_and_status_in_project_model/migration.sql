-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('INIT', 'IN_PROGRESS', 'TO_COMPLETED', 'COMPLETED');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "price" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "ProjectStatus" NOT NULL DEFAULT 'INIT';
