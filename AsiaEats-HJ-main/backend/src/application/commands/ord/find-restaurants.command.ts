import type { RestaurantSearchRequest, RestaurantSearchResult, RestaurantsService } from '#domain/ord/index.js';
import type { Command } from '#application/commands/command.js';

export class FindRestaurantsCommand implements Command<RestaurantSearchResult[]> {
  readonly name = 'FindRestaurantsCommand';

  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly request: RestaurantSearchRequest,
  ) {}

  execute(): Promise<RestaurantSearchResult[]> {
    return this.restaurantsService.find(this.request);
  }
}
