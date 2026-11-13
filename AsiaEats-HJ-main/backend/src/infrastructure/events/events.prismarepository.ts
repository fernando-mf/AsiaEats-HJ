import { Injectable } from '@nestjs/common';
import { Event, EventRepository, StoredEvent } from '#domain/events/index.js';
import { InternalError } from '#domain/errors.js';
import type { AccountRole } from '#domain/reg/index.js';
import type { Prisma } from '#infrastructure/generated/prisma/client.js';
import { PrismaService } from '#infrastructure/prisma.service.js';

@Injectable()
export class PrismaEventRepository extends EventRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }

  async append(event: Event<unknown>): Promise<void> {
    try {
      await this.db.eventLog.create({
        data: {
          id: event.id,
          entityType: event.entityType,
          entityId: event.entityId,
          eventType: event.eventType,
          payload: event.payload as Prisma.InputJsonValue,
          actorId: event.actor?.id ?? null,
          actorRole: event.actor?.role ?? null,
          occurredAt: event.occurredAt,
        },
      });
    } catch (err) {
      throw new InternalError(err as Error);
    }
  }

  async findByEntity(entityType: string, entityId: string): Promise<StoredEvent[]> {
    try {
      const rows = await this.db.eventLog.findMany({
        where: { entityType, entityId },
        orderBy: [{ occurredAt: 'asc' }],
      });

      return rows.map(row => ({
        id: row.id,
        entityType: row.entityType,
        entityId: row.entityId,
        eventType: row.eventType,
        payload: row.payload as Record<string, unknown>,
        actor: row.actorId && row.actorRole ? { id: row.actorId, role: row.actorRole as AccountRole } : null,
        occurredAt: row.occurredAt,
      }));
    } catch (err) {
      throw new InternalError(err as Error);
    }
  }
}
