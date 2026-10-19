import type { Account, AccountCreationRequest, AccountsService } from '#domain/reg/index.js';
import type { Command } from '../command.js';

export class CreateAccountCommand implements Command<Account> {
  readonly name = 'CreateAccountCommand';

  constructor(
    private readonly accountsService: AccountsService,
    private readonly request: AccountCreationRequest,
  ) {}

  execute(): Promise<Account> {
    return this.accountsService.create(this.request);
  }
}
