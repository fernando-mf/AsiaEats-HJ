import type { MenuItem, MenuItemCreationRequest, RestaurantsService } from '#domain/ord/index.js';
import type { Actor } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';

export class CreateMenuItemCommand implements Command<MenuItem> {
  readonly name = 'CreateMenuItemCommand';

  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly actor: Actor,
    private readonly restaurantId: string,
    private readonly request: MenuItemCreationRequest,
  ) {}

  execute(): Promise<MenuItem> {
    return this.restaurantsService.createMenuItem(this.actor, this.restaurantId, this.request);
  }
}
