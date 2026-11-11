import type { Account, AccountsService, AccountUpdateRequest, Actor } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';

export class UpdateAccountCommand implements Command<Account> {
  readonly name = 'UpdateAccountCommand';

  constructor(
    private readonly accountsService: AccountsService,
    private readonly actor: Actor,
    private readonly request: AccountUpdateRequest,
  ) {}

  execute(): Promise<Account> {
    return this.accountsService.update(this.actor, this.request);
  }
}
