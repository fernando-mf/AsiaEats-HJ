import { Injectable } from '@nestjs/common';
import { Event } from './events.models.js';

export abstract class EventRepository {
  abstract append(event: Event): Promise<void>;
}

@Injectable()
export class EventsService {
  constructor(private readonly events: EventRepository) {}

  async publish(event: Event): Promise<void> {
    await this.events.append(event);
  }
}
