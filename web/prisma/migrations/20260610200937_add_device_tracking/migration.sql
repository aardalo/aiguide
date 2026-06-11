-- DropIndex
DROP INDEX "branches_trip_id_anchor_day_date_idx";

-- AlterTable
ALTER TABLE "daily_destinations" ADD COLUMN     "last_modified_by_device_id" TEXT;

-- AlterTable
ALTER TABLE "daily_pois" ADD COLUMN     "last_modified_by_device_id" TEXT;

-- AlterTable
ALTER TABLE "route_segments" ADD COLUMN     "last_modified_by_device_id" TEXT;

-- AlterTable
ALTER TABLE "route_waypoints" ADD COLUMN     "last_modified_by_device_id" TEXT;

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "last_modified_by_device_id" TEXT;

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "session_id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "devices_session_id_key" ON "devices"("session_id");

-- CreateIndex
CREATE INDEX "daily_destinations_last_modified_by_device_id_idx" ON "daily_destinations"("last_modified_by_device_id");

-- CreateIndex
CREATE INDEX "daily_pois_last_modified_by_device_id_idx" ON "daily_pois"("last_modified_by_device_id");

-- CreateIndex
CREATE INDEX "route_segments_last_modified_by_device_id_idx" ON "route_segments"("last_modified_by_device_id");

-- CreateIndex
CREATE INDEX "route_waypoints_last_modified_by_device_id_idx" ON "route_waypoints"("last_modified_by_device_id");

-- CreateIndex
CREATE INDEX "trips_last_modified_by_device_id_idx" ON "trips"("last_modified_by_device_id");

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_last_modified_by_device_id_fkey" FOREIGN KEY ("last_modified_by_device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_destinations" ADD CONSTRAINT "daily_destinations_last_modified_by_device_id_fkey" FOREIGN KEY ("last_modified_by_device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_segments" ADD CONSTRAINT "route_segments_last_modified_by_device_id_fkey" FOREIGN KEY ("last_modified_by_device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_waypoints" ADD CONSTRAINT "route_waypoints_last_modified_by_device_id_fkey" FOREIGN KEY ("last_modified_by_device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_pois" ADD CONSTRAINT "daily_pois_last_modified_by_device_id_fkey" FOREIGN KEY ("last_modified_by_device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
