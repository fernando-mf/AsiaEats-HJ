-- AlterTable
ALTER TABLE "orders" ADD COLUMN "delivery_street" TEXT,
ADD COLUMN "delivery_city" TEXT,
ADD COLUMN "delivery_postal_code" TEXT,
ADD COLUMN "delivery_latitude" DOUBLE PRECISION,
ADD COLUMN "delivery_longitude" DOUBLE PRECISION;

-- Backfill: existing orders take their customer's current address, the best record available.
UPDATE "orders" AS o
SET "delivery_street" = c."street",
    "delivery_city" = c."city",
    "delivery_postal_code" = c."postal_code",
    "delivery_latitude" = c."latitude",
    "delivery_longitude" = c."longitude"
FROM "customers" AS c
WHERE c."account_id" = o."customer_id"
  AND c."street" IS NOT NULL;
