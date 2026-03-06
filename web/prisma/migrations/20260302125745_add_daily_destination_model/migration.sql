-- CreateTable
CREATE TABLE "daily_destinations" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "day_date" DATE NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_destinations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_destinations_trip_id_idx" ON "daily_destinations"("trip_id");

-- CreateIndex
CREATE INDEX "daily_destinations_day_date_idx" ON "daily_destinations"("day_date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_destinations_trip_id_day_date_key" ON "daily_destinations"("trip_id", "day_date");

-- AddForeignKey
ALTER TABLE "daily_destinations" ADD CONSTRAINT "daily_destinations_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
