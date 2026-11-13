-- CreateEnum
CREATE TYPE "ledger_entry_kind" AS ENUM ('charge', 'refund');

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "kind" "ledger_entry_kind" NOT NULL,
    "order_status" "order_status" NOT NULL,
    "customer_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "delivery_fee" DECIMAL(10,2) NOT NULL,
    "service_fee" DECIMAL(10,2) NOT NULL,
    "small_order_surcharge" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "order_placed_at" TIMESTAMP(3) NOT NULL,
    "order_closed_at" TIMESTAMP(3) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ledger_entries_customer_id_idx" ON "ledger_entries"("customer_id");

-- CreateIndex
CREATE INDEX "ledger_entries_restaurant_id_idx" ON "ledger_entries"("restaurant_id");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_order_id_kind_key" ON "ledger_entries"("order_id", "kind");

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

