import { Global, Module } from '@nestjs/common';
import { EventRepository } from '#domain/events/index.js';
import { AccountRepository } from '#domain/reg/index.js';
import { PrismaService } from './prisma.service.js';
import { PrismaEventRepository } from './events/events.prismarepository.js';
import { PrismaAccountRepository } from './reg/accounts.prismarepository.js';

@Global()
@Module({
  providers: [
    PrismaService,
    { provide: AccountRepository, useClass: PrismaAccountRepository },
    { provide: EventRepository, useClass: PrismaEventRepository },
  ],
  exports: [AccountRepository, EventRepository],
})
export class InfrastructureModule {}
