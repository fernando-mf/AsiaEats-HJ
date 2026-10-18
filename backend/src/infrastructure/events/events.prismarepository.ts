import { Injectable } from '@nestjs/common';
import { Event, EventRepository } from '#domain/events/index.js';
import { InternalError } from '#domain/errors.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class PrismaEventRepository extends EventRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }

  async append(event: Event): Promise<void> {
    try {
      const row = await this.db.eventLog.create({
        data: {
          entityType: event.entityType,
          entityId: event.entityId,
          eventType: event.eventType,
          payload: event.payload as Prisma.InputJsonValue,
          actorId: event.actorId,
          occurredAt: event.occurredAt,
        },
      });

      event.id = row.id;
    } catch (err) {
      throw new InternalError(err as Error);
    }
  }
}
