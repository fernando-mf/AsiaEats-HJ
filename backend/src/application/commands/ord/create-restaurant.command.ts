import type { Restaurant, RestaurantCreationRequest, RestaurantsService } from '#domain/ord/index.js';
import type { Actor } from '#domain/reg/index.js';
import type { Command } from '../command.js';

export class CreateRestaurantCommand implements Command<Restaurant> {
  readonly name = 'CreateRestaurantCommand';

  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly actor: Actor,
    private readonly request: RestaurantCreationRequest,
  ) {}

  execute(): Promise<Restaurant> {
    return this.restaurantsService.create(this.actor, this.request);
  }
}
