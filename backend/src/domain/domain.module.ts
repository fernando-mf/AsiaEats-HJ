import { Module } from '@nestjs/common';
import { EnvService } from './env/env.service.js';
import { EVENT_SUBSCRIBERS, EventsService } from './events/events.service.js';
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
    EnvService,
    EventsService,
    LedgerService,
    OrdersService,
    PricingService,
    RestaurantsService,
    {
      // The modules that react to published events (Observer): PRC's ledger.
      provide: EVENT_SUBSCRIBERS,
      useFactory: (ledger: LedgerService) => [ledger],
      inject: [LedgerService],
    },
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
    EnvService,
    EventsService,
    LedgerService,
    OrdersService,
    PricingService,
    RestaurantsService,
  ],
})
export class DomainModule {}
