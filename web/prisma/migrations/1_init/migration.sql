-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "startDate" DATE NOT NULL,
    "stopDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trips_createdAt_idx" ON "trips"("createdAt");
