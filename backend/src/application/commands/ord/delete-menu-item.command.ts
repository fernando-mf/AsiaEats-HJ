import type { RestaurantsService } from '#domain/ord/index.js';
import type { Actor } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';

export class DeleteMenuItemCommand implements Command<void> {
  readonly name = 'DeleteMenuItemCommand';

  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly actor: Actor,
    private readonly restaurantId: string,
    private readonly itemId: string,
  ) {}

  execute(): Promise<void> {
    return this.restaurantsService.deleteMenuItem(this.actor, this.restaurantId, this.itemId);
  }
}
