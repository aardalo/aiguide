-- DropIndex
DROP INDEX "daily_destinations_trip_id_day_date_key";

-- DropIndex
DROP INDEX "route_segments_trip_id_day_date_key";

-- AlterTable
ALTER TABLE "daily_destinations" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "daily_pois" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "route_segments" ADD COLUMN     "branch_id" TEXT;

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "color" VARCHAR(7) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "branches_trip_id_idx" ON "branches"("trip_id");

-- CreateIndex
CREATE INDEX "daily_destinations_trip_id_day_date_branch_id_idx" ON "daily_destinations"("trip_id", "day_date", "branch_id");

-- CreateIndex
CREATE INDEX "route_segments_trip_id_day_date_branch_id_idx" ON "route_segments"("trip_id", "day_date", "branch_id");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_destinations" ADD CONSTRAINT "daily_destinations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_segments" ADD CONSTRAINT "route_segments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_pois" ADD CONSTRAINT "daily_pois_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partial unique indexes: enforce one destination/segment per day per branch
-- Main branch (NULL): at most one per (trip, day)
CREATE UNIQUE INDEX "daily_destinations_trip_day_main_uq"
  ON "daily_destinations" ("trip_id", "day_date")
  WHERE "branch_id" IS NULL;
CREATE UNIQUE INDEX "route_segments_trip_day_main_uq"
  ON "route_segments" ("trip_id", "day_date")
  WHERE "branch_id" IS NULL;

-- Named branches: at most one per (trip, day, branch)
CREATE UNIQUE INDEX "daily_destinations_trip_day_branch_uq"
  ON "daily_destinations" ("trip_id", "day_date", "branch_id")
  WHERE "branch_id" IS NOT NULL;
CREATE UNIQUE INDEX "route_segments_trip_day_branch_uq"
  ON "route_segments" ("trip_id", "day_date", "branch_id")
  WHERE "branch_id" IS NOT NULL;
