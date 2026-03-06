-- CreateTable
CREATE TABLE "route_segments" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "day_date" DATE NOT NULL,
    "from_destination_id" VARCHAR(30) NOT NULL,
    "to_destination_id" VARCHAR(30) NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "distance_meters" DOUBLE PRECISION NOT NULL,
    "duration_seconds" DOUBLE PRECISION NOT NULL,
    "encoded_polyline" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "route_segments_trip_id_idx" ON "route_segments"("trip_id");

-- CreateIndex
CREATE UNIQUE INDEX "route_segments_trip_id_day_date_key" ON "route_segments"("trip_id", "day_date");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- AddForeignKey
ALTER TABLE "route_segments" ADD CONSTRAINT "route_segments_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
