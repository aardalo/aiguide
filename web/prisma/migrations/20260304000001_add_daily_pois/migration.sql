-- CreateTable
CREATE TABLE "daily_pois" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "day_date" DATE NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_pois_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_pois_trip_id_idx" ON "daily_pois"("trip_id");

-- CreateIndex
CREATE INDEX "daily_pois_day_date_idx" ON "daily_pois"("day_date");

-- AddForeignKey
ALTER TABLE "daily_pois" ADD CONSTRAINT "daily_pois_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
