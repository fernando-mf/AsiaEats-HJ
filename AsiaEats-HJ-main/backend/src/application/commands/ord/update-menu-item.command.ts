import type { MenuItem, MenuItemUpdateRequest, RestaurantsService } from '#domain/ord/index.js';
import type { Actor } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';

export class UpdateMenuItemCommand implements Command<MenuItem> {
  readonly name = 'UpdateMenuItemCommand';

  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly actor: Actor,
    private readonly restaurantId: string,
    private readonly itemId: string,
    private readonly request: MenuItemUpdateRequest,
  ) {}

  execute(): Promise<MenuItem> {
    return this.restaurantsService.updateMenuItem(this.actor, this.restaurantId, this.itemId, this.request);
  }
}
