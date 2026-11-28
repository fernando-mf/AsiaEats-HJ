-- CreateTable
CREATE TABLE "ratings" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "courier_id" UUID NOT NULL,
    "restaurant_rating" INTEGER NOT NULL,
    "courier_rating" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ratings_restaurant_rating_check" CHECK ("restaurant_rating" BETWEEN 1 AND 5),
    CONSTRAINT "ratings_courier_rating_check" CHECK ("courier_rating" BETWEEN 1 AND 5)
);

-- CreateIndex
CREATE UNIQUE INDEX "ratings_order_id_key" ON "ratings"("order_id");

-- CreateIndex
CREATE INDEX "ratings_restaurant_id_idx" ON "ratings"("restaurant_id");

-- CreateIndex
CREATE INDEX "ratings_courier_id_idx" ON "ratings"("courier_id");

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "couriers"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE;
