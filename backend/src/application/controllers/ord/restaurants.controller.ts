import { Body, Controller, Post } from '@nestjs/common';
import { AccountRole, type Actor } from '#domain/reg/index.js';
import { RestaurantCreationRequest, RestaurantsService } from '#domain/ord/index.js';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly service: RestaurantsService) {}

  @Post()
  create(@Body() body: RestaurantCreationRequest) {
    // TODO: get the actor from the JWT instead of this hack
    const actor: Actor = { id: '', role: AccountRole.Restaurant };

    const request = RestaurantCreationRequest.initialize(body);
    return this.service.create(actor, request);
  }
}
