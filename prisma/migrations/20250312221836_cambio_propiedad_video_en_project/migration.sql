/*
  Warnings:

  - You are about to drop the column `videoUrl` on the `Project` table. All the data in the column will be lost.
  - Added the required column `video` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Project" DROP COLUMN "videoUrl",
ADD COLUMN     "video" TEXT NOT NULL;
