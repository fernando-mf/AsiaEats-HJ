-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "street" DROP NOT NULL,
ALTER COLUMN "city" DROP NOT NULL,
ALTER COLUMN "postal_code" DROP NOT NULL,
ALTER COLUMN "latitude" DROP NOT NULL,
ALTER COLUMN "longitude" DROP NOT NULL;

-- Backfill: every existing customer account gets a customer entry without address.
INSERT INTO "customers" ("account_id", "created_at", "updated_at")
SELECT "id", "created_at", "updated_at"
FROM "accounts"
WHERE "role" = 'customer'
ON CONFLICT ("account_id") DO NOTHING;
