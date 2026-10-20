import type { Restaurant, RestaurantsService, RestaurantUpdateRequest } from '#domain/ord/index.js';
import type { Actor } from '#domain/reg/index.js';
import type { Command } from '../command.js';

export class UpdateRestaurantCommand implements Command<Restaurant> {
  readonly name = 'UpdateRestaurantCommand';

  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly actor: Actor,
    private readonly id: string,
    private readonly request: RestaurantUpdateRequest,
  ) {}

  execute(): Promise<Restaurant> {
    return this.restaurantsService.update(this.actor, this.id, this.request);
  }
}
