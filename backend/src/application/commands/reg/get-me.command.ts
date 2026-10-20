import type { Account, AccountsService, Actor } from '#domain/reg/index.js';
import type { Command } from '../command.js';

export class GetMeCommand implements Command<Account> {
  readonly name = 'GetMeCommand';

  constructor(
    private readonly accountsService: AccountsService,
    private readonly actor: Actor,
  ) {}

  execute(): Promise<Account> {
    return this.accountsService.getById(this.actor.id);
  }
}
