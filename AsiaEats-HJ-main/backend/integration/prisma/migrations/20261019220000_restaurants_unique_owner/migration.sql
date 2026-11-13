-- DropIndex
DROP INDEX "restaurants_owner_id_idx";

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_owner_id_key" ON "restaurants"("owner_id");
