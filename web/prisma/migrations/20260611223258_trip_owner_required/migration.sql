/*
  Warnings:

  - Made the column `owner_id` on table `trips` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "trips" ALTER COLUMN "owner_id" SET NOT NULL;
