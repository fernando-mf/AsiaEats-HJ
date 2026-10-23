import { Injectable } from '@nestjs/common';
import { EventsService } from '#domain/events/index.js';
import { Account, AccountCreatedEvent, AccountRole } from './accounts.models.js';

// AccountCreationHandler is an object that creates a "specialized" account.
export interface AccountCreationHandler {
  readonly role: AccountRole;
  handleAccountCreation(account: Account): Promise<void>;
}

export const ACCOUNT_CREATION_HANDLERS = Symbol('ACCOUNT_CREATION_HANDLERS');

// DefaultAccountCreationHandler handles account creation for "non-specialized" accounts.
@Injectable()
export class DefaultAccountCreationHandler implements AccountCreationHandler {
  role: AccountRole;

  constructor(private readonly events: EventsService) {}

  async handleAccountCreation(account: Account): Promise<void> {
    await this.events.publish(
      new AccountCreatedEvent({
        entityId: account.id,
        payload: account.toJSON(),
        actor: { id: account.id, role: account.role },
      }),
    );
  }
}
