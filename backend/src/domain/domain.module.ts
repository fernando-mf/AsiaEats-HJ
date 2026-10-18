import { Module } from '@nestjs/common';
import { EventsService } from './events/events.service.js';
import { RestaurantsService } from './ord/restaurants.service.js';
import { AccountsService } from './reg/accounts.service.js';

@Module({
  providers: [AccountsService, EventsService, RestaurantsService],
  exports: [AccountsService, EventsService, RestaurantsService],
})
export class DomainModule {}
