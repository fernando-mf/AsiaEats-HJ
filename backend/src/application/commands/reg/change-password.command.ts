import type { Account, AccountsService, Actor, PasswordChangeRequest } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';

export class ChangePasswordCommand implements Command<Account> {
  readonly name = 'ChangePasswordCommand';

  constructor(
    private readonly accountsService: AccountsService,
    private readonly actor: Actor,
    private readonly request: PasswordChangeRequest,
  ) {}

  execute(): Promise<Account> {
    return this.accountsService.changePassword(this.actor, this.request);
  }
}
