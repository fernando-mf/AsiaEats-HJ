import type { MenuItem, RestaurantsService } from '#domain/ord/index.js';
import type { Actor } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';

export class GetMenuCommand implements Command<MenuItem[]> {
  readonly name = 'GetMenuCommand';
  readonly readOnly = true;

  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly actor: Actor,
    private readonly restaurantId: string,
  ) {}

  execute(): Promise<MenuItem[]> {
    return this.restaurantsService.browseMenu(this.actor, this.restaurantId);
  }
}
