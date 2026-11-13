-- AlterTable
ALTER TABLE "delivery_assignments" ADD COLUMN     "declined_courier_ids" UUID[] DEFAULT ARRAY[]::UUID[];
