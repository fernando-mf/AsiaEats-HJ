import { Module } from '@nestjs/common';
import { DispatcherService } from './dlv/dispatcher.service.js';
import { EnvService } from './env/env.service.js';
import { EventsService } from './events/events.service.js';
import { OrdersService } from './ord/orders.service.js';
import { RestaurantsService } from './ord/restaurants.service.js';
import { ACCOUNT_CREATION_HANDLERS, DefaultAccountCreationHandler } from './reg/accounts.handlers.js';
import { AccountsService } from './reg/accounts.service.js';
import { CouriersService } from './reg/couriers.service.js';
import { CustomersService } from './reg/customers.service.js';

@Module({
  providers: [
    AccountsService,
    CouriersService,
    CustomersService,
    DefaultAccountCreationHandler,
    DispatcherService,
    EnvService,
    EventsService,
    OrdersService,
    RestaurantsService,
    {
      provide: ACCOUNT_CREATION_HANDLERS,
      useFactory: (customers: CustomersService, couriers: CouriersService) => [customers, couriers],
      inject: [CustomersService, CouriersService],
    },
  ],
  exports: [
    AccountsService,
    CouriersService,
    CustomersService,
    DispatcherService,
    EnvService,
    EventsService,
    OrdersService,
    RestaurantsService,
  ],
})
export class DomainModule {}
