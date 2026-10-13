import { Module } from '@nestjs/common';
import { AccountsService } from './reg/accounts.service.js';

@Module({
  providers: [AccountsService],
  exports: [AccountsService],
})
export class DomainModule {}
