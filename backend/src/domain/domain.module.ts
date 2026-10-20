import { Module } from '@nestjs/common';
import { EventsService } from './events/events.service.js';
import { OrdersService } from './ord/orders.service.js';
import { RestaurantsService } from './ord/restaurants.service.js';
import { AccountsService } from './reg/accounts.service.js';

@Module({
  providers: [AccountsService, EventsService, OrdersService, RestaurantsService],
  exports: [AccountsService, EventsService, OrdersService, RestaurantsService],
})
export class DomainModule {}
