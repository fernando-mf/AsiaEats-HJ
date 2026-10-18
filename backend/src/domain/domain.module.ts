import { Module } from '@nestjs/common';
import { EventsService } from './events/events.service.js';
import { AccountsService } from './reg/accounts.service.js';

@Module({
  providers: [AccountsService, EventsService],
  exports: [AccountsService, EventsService],
})
export class DomainModule {}
