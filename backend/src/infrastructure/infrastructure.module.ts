import { Global, Module } from '@nestjs/common';
import { AccountRepository } from '#domain/reg/index.js';
import { LocalAccountRepository } from './reg/accounts.localrepository.js';

@Global()
@Module({
  providers: [{ provide: AccountRepository, useClass: LocalAccountRepository }],
  exports: [AccountRepository],
})
export class InfrastructureModule {}
