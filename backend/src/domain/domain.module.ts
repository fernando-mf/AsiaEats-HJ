import { Module } from '@nestjs/common';
import { DeliveryService } from './dlv/delivery.service.js';
import { EnvService } from './env/env.service.js';
import { EventsService } from './events/events.service.js';
import { OrdersService } from './ord/orders.service.js';
import { RestaurantsService } from './ord/restaurants.service.js';
import { BillingService } from './prc/billing.service.js';
import { LedgerService } from './prc/ledger.service.js';
import { PricingService } from './prc/pricing.service.js';
import { ACCOUNT_CREATION_HANDLERS, DefaultAccountCreationHandler } from './reg/accounts.handlers.js';
import { AccountsService } from './reg/accounts.service.js';
import { CouriersService } from './reg/couriers.service.js';
import { CustomersService } from './reg/customers.service.js';

@Module({
  providers: [
    AccountsService,
    BillingService,
    CouriersService,
    CustomersService,
    DefaultAccountCreationHandler,
    DeliveryService,
    EnvService,
    EventsService,
    LedgerService,
    OrdersService,
    PricingService,
    RestaurantsService,
    {
      provide: ACCOUNT_CREATION_HANDLERS,
      useFactory: (customers: CustomersService, couriers: CouriersService) => [customers, couriers],
      inject: [CustomersService, CouriersService],
    },
  ],
  exports: [
    AccountsService,
    BillingService,
    CouriersService,
    CustomersService,
    DeliveryService,
    EnvService,
    EventsService,
    LedgerService,
    OrdersService,
    PricingService,
    RestaurantsService,
  ],
})
export class DomainModule {}
