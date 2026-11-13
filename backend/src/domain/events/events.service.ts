import { Injectable, Logger } from '@nestjs/common';
import { validate } from 'class-validator';
import { Event, GetByEntityQuery, StoredEvent } from './events.models.js';
import { InvalidParamsError } from '#domain/errors.js';

export abstract class EventRepository {
  abstract append(event: Event): Promise<void>;
  abstract findByEntity(entityType: string, entityId: string): Promise<StoredEvent[]>;
}

export type EventHandler = (event: Event) => Promise<void> | void;

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly handlers = new Map<string, EventHandler[]>();

  constructor(private readonly events: EventRepository) {}

  subscribe(eventType: string, handler: EventHandler): void {
    this.handlers.set(eventType, [...(this.handlers.get(eventType) ?? []), handler]);
  }

  async publish(event: Event): Promise<void> {
    await this.events.append(event);

    for (const handler of this.handlers.get(event.eventType) ?? []) {
      try {
        await handler(event);
      } catch (err) {
        this.logger.error(`handler for ${event.eventType} failed: ${err}`);
      }
    }
  }

  async getByEntity(entityType: string, entityId: string): Promise<StoredEvent[]> {
    const query = GetByEntityQuery.initialize({ entityType, entityId });
    const errors = await validate(query);
    if (errors.length > 0) {
      throw InvalidParamsError.fromClassValidator(errors);
    }

    return this.events.findByEntity(query.entityType, query.entityId);
  }
}
