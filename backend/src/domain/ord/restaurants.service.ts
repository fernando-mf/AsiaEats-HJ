import { Injectable } from '@nestjs/common';
import { EventsService } from '#domain/events/index.js';
import { InternalError } from '#domain/errors.js';
import type { Actor } from '#domain/reg/index.js';
import { Restaurant, RestaurantCreationRequest } from './restaurants.models.js';

export abstract class RestaurantRepository {
  abstract create(restaurant: Restaurant): Promise<Restaurant>;
}

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly repository: RestaurantRepository,
    private readonly events: EventsService,
  ) {}

  async create(_actor: Actor, _request: RestaurantCreationRequest): Promise<Restaurant> {
    // TODO: implement logic
    throw new InternalError('not implemented');
  }
}
