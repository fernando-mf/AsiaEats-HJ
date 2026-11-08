-- CreateEnum
CREATE TYPE "courier_status" AS ENUM ('offline', 'idle', 'assigned', 'carrying');

-- CreateTable
CREATE TABLE "couriers" (
    "account_id" UUID NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" "courier_status" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "couriers_pkey" PRIMARY KEY ("account_id")
);

-- AddForeignKey
ALTER TABLE "couriers" ADD CONSTRAINT "couriers_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: every existing courier account gets an offline courier without position.
INSERT INTO "couriers" ("account_id", "status", "created_at", "updated_at")
SELECT "id", 'offline', "created_at", "updated_at"
FROM "accounts"
WHERE "role" = 'courier'
ON CONFLICT ("account_id") DO NOTHING;
