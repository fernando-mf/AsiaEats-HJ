import { Inject, Injectable, Optional } from '@nestjs/common';
import { validate } from 'class-validator';
import { Event, GetByEntityQuery, StoredEvent } from './events.models.js';
import { InvalidParamsError } from '#domain/errors.js';

export abstract class EventRepository {
  abstract append(event: Event): Promise<void>;
  abstract findByEntity(entityType: string, entityId: string): Promise<StoredEvent[]>;
}

// Observer pattern. An EventSubscriber reacts to the events other modules publish, without
// the publisher knowing it exists: e.g. PRC records the ledger entry when ORD reports that an
// order reached its final state.
export interface EventSubscriber {
  handle(event: Event): Promise<void>;
}

// The subscribers EventsService notifies, provided by the domain module.
export const EVENT_SUBSCRIBERS = Symbol('EVENT_SUBSCRIBERS');

// EventsService is the subject: publish records the event in the append-only log (R-ORD-05),
// then notifies every subscriber in turn. Publishing runs inside the command's transaction, so
// a subscriber that fails rolls the state change back with it: the change and its consequences
// are saved together or not at all.
@Injectable()
export class EventsService {
  constructor(
    private readonly events: EventRepository,
    @Optional() @Inject(EVENT_SUBSCRIBERS) private readonly subscribers: readonly EventSubscriber[] = [],
  ) {}

  async publish(event: Event): Promise<void> {
    await this.events.append(event);
    for (const subscriber of this.subscribers) {
      await subscriber.handle(event);
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
