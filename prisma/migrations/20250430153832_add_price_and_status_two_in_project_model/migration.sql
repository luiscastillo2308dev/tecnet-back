/*
  Warnings:

  - You are about to alter the column `price` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "price" SET DEFAULT 0.0,
ALTER COLUMN "price" SET DATA TYPE DECIMAL(10,2);
