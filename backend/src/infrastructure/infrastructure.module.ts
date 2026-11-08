import { Global, Module } from '@nestjs/common';
import { EnvironmentRepository } from '#domain/env/index.js';
import { EventRepository } from '#domain/events/index.js';
import { AccountRepository, CourierRepository, CustomerProfileRepository } from '#domain/reg/index.js';
import { OrderRepository, RestaurantRepository } from '#domain/ord/index.js';
import { PrismaService } from './prisma.service.js';
import { PrismaEnvironmentRepository } from './env/environment.prismarepository.js';
import { PrismaEventRepository } from './events/events.prismarepository.js';
import { PrismaAccountRepository } from './reg/accounts.prismarepository.js';
import { PrismaCourierRepository } from './reg/couriers.prismarepository.js';
import { PrismaCustomerProfileRepository } from './reg/customers.prismarepository.js';
import { PrismaOrderRepository } from './ord/orders.prismarepository.js';
import { PrismaRestaurantRepository } from './ord/restaurants.prismarepository.js';

@Global()
@Module({
  providers: [
    PrismaService,
    { provide: AccountRepository, useClass: PrismaAccountRepository },
    { provide: CourierRepository, useClass: PrismaCourierRepository },
    { provide: CustomerProfileRepository, useClass: PrismaCustomerProfileRepository },
    { provide: EnvironmentRepository, useClass: PrismaEnvironmentRepository },
    { provide: EventRepository, useClass: PrismaEventRepository },
    { provide: OrderRepository, useClass: PrismaOrderRepository },
    { provide: RestaurantRepository, useClass: PrismaRestaurantRepository },
  ],
  exports: [
    AccountRepository,
    CourierRepository,
    CustomerProfileRepository,
    EnvironmentRepository,
    EventRepository,
    OrderRepository,
    RestaurantRepository,
  ],
})
export class InfrastructureModule {}
