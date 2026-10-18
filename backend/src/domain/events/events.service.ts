import { Injectable } from '@nestjs/common';
import { validate } from 'class-validator';
import { Event, GetByEntityQuery, StoredEvent } from './events.models.js';
import { InvalidParamsError } from '#domain/errors.js';

export abstract class EventRepository {
  abstract append(event: Event): Promise<void>;
  abstract findByEntity(entityType: string, entityId: string): Promise<StoredEvent[]>;
}

@Injectable()
export class EventsService {
  constructor(private readonly events: EventRepository) {}

  async publish(event: Event): Promise<void> {
    await this.events.append(event);
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
