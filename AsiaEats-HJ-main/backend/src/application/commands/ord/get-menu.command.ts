import type { MenuItem, RestaurantsService } from '#domain/ord/index.js';
import type { Command } from '#application/commands/command.js';

export class GetMenuCommand implements Command<MenuItem[]> {
  readonly name = 'GetMenuCommand';

  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly restaurantId: string,
  ) {}

  execute(): Promise<MenuItem[]> {
    return this.restaurantsService.getMenu(this.restaurantId);
  }
}
