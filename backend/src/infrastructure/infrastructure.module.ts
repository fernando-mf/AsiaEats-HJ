import { Global, Module } from '@nestjs/common';
import { AccountRepository } from '#domain/reg/index.js';
import { PrismaService } from './prisma.service.js';
import { PrismaAccountRepository } from './reg/accounts.prismarepository.js';

@Global()
@Module({
  providers: [PrismaService, { provide: AccountRepository, useClass: PrismaAccountRepository }],
  exports: [AccountRepository],
})
export class InfrastructureModule {}
