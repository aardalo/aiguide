ALTER TABLE "branches" ADD COLUMN "anchor_day_date" DATE;

UPDATE "branches" AS b
SET "anchor_day_date" = src.min_day
FROM (
  SELECT "branch_id", MIN("day_date") AS min_day
  FROM "daily_destinations"
  WHERE "branch_id" IS NOT NULL
  GROUP BY "branch_id"
) AS src
WHERE b."id" = src."branch_id";

UPDATE "branches" AS b
SET "anchor_day_date" = t."startDate"::date
FROM "trips" AS t
WHERE b."trip_id" = t."id" AND b."anchor_day_date" IS NULL;

ALTER TABLE "branches" ALTER COLUMN "anchor_day_date" SET NOT NULL;

CREATE INDEX "branches_trip_id_anchor_day_date_idx"
ON "branches" ("trip_id", "anchor_day_date");