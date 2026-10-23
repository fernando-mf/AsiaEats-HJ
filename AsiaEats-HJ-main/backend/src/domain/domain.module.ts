import { Module } from '@nestjs/common';
import { EnvService } from './env/env.service.js';
import { EventsService } from './events/events.service.js';
import { OrdersService } from './ord/orders.service.js';
import { RestaurantsService } from './ord/restaurants.service.js';
import { ACCOUNT_CREATION_HANDLERS, DefaultAccountCreationHandler } from './reg/accounts.handlers.js';
import { AccountsService } from './reg/accounts.service.js';
import { CustomersService } from './reg/customers.service.js';

@Module({
  providers: [
    AccountsService,
    CustomersService,
    DefaultAccountCreationHandler,
    EnvService,
    EventsService,
    OrdersService,
    RestaurantsService,
    {
      provide: ACCOUNT_CREATION_HANDLERS,
      useFactory: (customers: CustomersService) => [customers],
      inject: [CustomersService],
    },
  ],
  exports: [AccountsService, CustomersService, EnvService, EventsService, OrdersService, RestaurantsService],
})
export class DomainModule {}
