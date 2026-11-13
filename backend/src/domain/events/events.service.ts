import { Injectable, Logger } from '@nestjs/common';
import { validate } from 'class-validator';
import { Event, GetByEntityQuery, StoredEvent } from './events.models.js';
import { InvalidParamsError } from '#domain/errors.js';

export abstract class EventRepository {
  abstract append(event: Event): Promise<void>;
  abstract findByEntity(entityType: string, entityId: string): Promise<StoredEvent[]>;
}

export type EventHandler = (event: Event) => Promise<void> | void;

export type SubscribeOptions = {
  // A critical handler's failure fails the publish, so the command's transaction rolls back and
  // the state change is not saved without its consequence: e.g. an order is never delivered or
  // refunded without its ledger entry (R-PRC-03, R-PRC-05). Other handlers' failures are logged
  // and the command goes on.
  critical?: boolean;
};

type Subscription = { handler: EventHandler; critical: boolean };

// Observer pattern. EventsService is the subject: publish records the event in the append-only
// log (R-ORD-05), then notifies the handlers subscribed to its type, in the command's transaction.
// Modules subscribe when the app starts, so the publisher never knows who reacts to its events.
@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly handlers = new Map<string, Subscription[]>();

  constructor(private readonly events: EventRepository) {}

  subscribe(eventType: string, handler: EventHandler, options: SubscribeOptions = {}): void {
    const subscription = { handler, critical: options.critical ?? false };
    this.handlers.set(eventType, [...(this.handlers.get(eventType) ?? []), subscription]);
  }

  async publish(event: Event): Promise<void> {
    await this.events.append(event);

    for (const { handler, critical } of this.handlers.get(event.eventType) ?? []) {
      try {
        await handler(event);
      } catch (err) {
        if (critical) throw err;
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
