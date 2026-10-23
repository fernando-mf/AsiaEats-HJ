-- CreateTable
CREATE TABLE "event_log" (
    "id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "actor_id" UUID,
    "occurred_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_log_entity_type_entity_id_idx" ON "event_log"("entity_type", "entity_id");
