import type { Actor, CouriersService } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';

export class CourierGoOnlineCommand implements Command<void> {
  readonly name = 'CourierGoOnlineCommand';

  constructor(
    private readonly couriersService: CouriersService,
    private readonly actor: Actor,
  ) {}

  execute(): Promise<void> {
    return this.couriersService.goOnline(this.actor.id);
  }
}

export class CourierGoOfflineCommand implements Command<void> {
  readonly name = 'CourierGoOfflineCommand';

  constructor(
    private readonly couriersService: CouriersService,
    private readonly actor: Actor,
  ) {}

  execute(): Promise<void> {
    return this.couriersService.goOffline(this.actor.id);
  }
}
