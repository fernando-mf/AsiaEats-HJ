import { Global, Module } from '@nestjs/common';
import { EventRepository } from '#domain/events/index.js';
import { AccountRepository } from '#domain/reg/index.js';
import { OrderRepository, RestaurantRepository } from '#domain/ord/index.js';
import { PrismaService } from './prisma.service.js';
import { PrismaEventRepository } from './events/events.prismarepository.js';
import { PrismaAccountRepository } from './reg/accounts.prismarepository.js';
import { PrismaOrderRepository } from './ord/orders.prismarepository.js';
import { PrismaRestaurantRepository } from './ord/restaurants.prismarepository.js';

@Global()
@Module({
  providers: [
    PrismaService,
    { provide: AccountRepository, useClass: PrismaAccountRepository },
    { provide: EventRepository, useClass: PrismaEventRepository },
    { provide: OrderRepository, useClass: PrismaOrderRepository },
    { provide: RestaurantRepository, useClass: PrismaRestaurantRepository },
  ],
  exports: [AccountRepository, EventRepository, OrderRepository, RestaurantRepository],
})
export class InfrastructureModule {}
