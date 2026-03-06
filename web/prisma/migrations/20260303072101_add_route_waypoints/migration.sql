-- CreateTable
CREATE TABLE "route_waypoints" (
    "id" TEXT NOT NULL,
    "segment_id" TEXT NOT NULL,
    "sequence_index" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "target_duration_seconds" DOUBLE PRECISION NOT NULL,
    "actual_duration_seconds" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_waypoints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "route_waypoints_segment_id_idx" ON "route_waypoints"("segment_id");

-- AddForeignKey
ALTER TABLE "route_waypoints" ADD CONSTRAINT "route_waypoints_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "route_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
