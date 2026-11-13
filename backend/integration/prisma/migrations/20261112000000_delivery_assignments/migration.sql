-- CreateEnum
CREATE TYPE "assignment_status" AS ENUM ('queued', 'offered', 'accepted', 'stalled');

-- CreateTable
CREATE TABLE "delivery_assignments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "courier_id" UUID,
    "status" "assignment_status" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_assignments_order_id_key" ON "delivery_assignments"("order_id");

-- CreateIndex
CREATE INDEX "delivery_assignments_courier_id_idx" ON "delivery_assignments"("courier_id");

-- AddForeignKey
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "couriers"("account_id") ON DELETE SET NULL ON UPDATE CASCADE;
