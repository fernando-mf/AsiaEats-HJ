import type { EventsService, StoredEvent } from '#domain/events/index.js';
import type { Command } from '#application/commands/command.js';

export class GetEventsByEntityCommand implements Command<StoredEvent[]> {
  readonly name = 'GetEventsByEntityCommand';

  constructor(
    private readonly eventsService: EventsService,
    private readonly entityType: string,
    private readonly entityId: string,
  ) {}

  execute(): Promise<StoredEvent[]> {
    return this.eventsService.getByEntity(this.entityType, this.entityId);
  }
}
