import { describe, expect, it, vi } from 'vitest';
import { TransactionRunner } from '#domain/transactions.js';
import type { Command } from './command.js';
import { CommandRunner } from './command-runner.js';

// A transaction runner that records whether the work ran inside it.
class RecordingTransactionRunner extends TransactionRunner {
  active = false;
  runs = 0;

  async run<T>(work: () => Promise<T>): Promise<T> {
    this.runs += 1;
    this.active = true;
    try {
      return await work();
    } finally {
      this.active = false;
    }
  }
}

describe('CommandRunner', () => {
  it('executes only the supplied command and returns its result', async () => {
    const result = { id: 'result-1' };
    const execute = vi.fn().mockResolvedValue(result);
    const command: Command<typeof result> = { name: 'TestCommand', execute };
    const runner = new CommandRunner(new RecordingTransactionRunner());

    await expect(runner.execute(command)).resolves.toBe(result);
    expect(execute).toHaveBeenCalledOnce();
  });

  it('runs the command inside one transaction, so its writes and events commit together', async () => {
    const transactions = new RecordingTransactionRunner();
    let ranInTransaction = false;
    const command: Command<void> = {
      name: 'TestCommand',
      execute: async () => {
        ranInTransaction = transactions.active;
      },
    };

    await new CommandRunner(transactions).execute(command);

    expect(transactions.runs).toBe(1);
    expect(ranInTransaction).toBe(true);
  });

  it('runs a read-only command outside a transaction', async () => {
    const transactions = new RecordingTransactionRunner();
    let ranInTransaction = true;
    const command: Command<void> = {
      name: 'TestQuery',
      readOnly: true,
      execute: async () => {
        ranInTransaction = transactions.active;
      },
    };

    await new CommandRunner(transactions).execute(command);

    expect(transactions.runs).toBe(0);
    expect(ranInTransaction).toBe(false);
  });

  it('propagates the command error unchanged, which rolls the transaction back', async () => {
    const error = new Error('command failed');
    const command: Command<never> = {
      name: 'FailingCommand',
      execute: vi.fn().mockRejectedValue(error),
    };
    const runner = new CommandRunner(new RecordingTransactionRunner());

    await expect(runner.execute(command)).rejects.toBe(error);
  });
});
