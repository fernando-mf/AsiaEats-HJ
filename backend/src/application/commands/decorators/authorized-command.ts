import { ForbiddenError } from '#domain/errors.js';
import type { AccountRole, Actor } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';
import { CommandDecorator } from './command-decorator.js';

export class AuthorizedCommand<TResult> extends CommandDecorator<TResult> {
  constructor(
    wrapped: Command<TResult>,
    private readonly actor: Actor,
    private readonly allowedRoles: readonly AccountRole[],
  ) {
    super(wrapped);
  }

  async execute(): Promise<TResult> {
    if (!this.allowedRoles.includes(this.actor.role)) {
      throw new ForbiddenError(`role ${this.actor.role} cannot execute ${this.name}`);
    }

    return this.wrapped.execute();
  }
}
