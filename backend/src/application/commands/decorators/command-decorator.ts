import type { Command } from '../command.js';

export abstract class CommandDecorator<TResult> implements Command<TResult> {
  constructor(protected readonly wrapped: Command<TResult>) {}

  get name(): string {
    return this.wrapped.name;
  }

  abstract execute(): Promise<TResult>;
}
