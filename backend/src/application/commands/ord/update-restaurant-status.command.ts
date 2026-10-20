import type { Restaurant, RestaurantsService, RestaurantStatusUpdateRequest } from '#domain/ord/index.js';
import type { Actor } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';

export class UpdateRestaurantStatusCommand implements Command<Restaurant> {
  readonly name = 'UpdateRestaurantStatusCommand';

  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly actor: Actor,
    private readonly id: string,
    private readonly request: RestaurantStatusUpdateRequest,
  ) {}

  execute(): Promise<Restaurant> {
    return this.restaurantsService.updateStatus(this.actor, this.id, this.request);
  }
}
