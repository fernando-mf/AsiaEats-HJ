import { Injectable } from '@nestjs/common';
import { TransactionRunner } from '#domain/transactions.js';
import type { Command } from './command.js';

// CommandRunner executes every command the controllers build. Each command that changes state
// runs as one unit of work, so the state it changes and the events it publishes are saved
// together or not at all. Read-only commands skip the transaction, which would only add two
// round trips to the database.
@Injectable()
export class CommandRunner {
  constructor(private readonly transactions: TransactionRunner) {}

  execute<TResult>(command: Command<TResult>): Promise<TResult> {
    if (command.readOnly) {
      return command.execute();
    }
    return this.transactions.run(() => command.execute());
  }
}
