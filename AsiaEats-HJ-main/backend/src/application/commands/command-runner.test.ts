import { describe, expect, it, vi } from 'vitest';
import type { Command } from './command.js';
import { CommandRunner } from './command-runner.js';

describe('CommandRunner', () => {
  it('executes only the supplied command and returns its result', async () => {
    const result = { id: 'result-1' };
    const execute = vi.fn().mockResolvedValue(result);
    const command: Command<typeof result> = { name: 'TestCommand', execute };
    const runner = new CommandRunner();

    await expect(runner.execute(command)).resolves.toBe(result);
    expect(execute).toHaveBeenCalledOnce();
  });

  it('propagates the command error unchanged', async () => {
    const error = new Error('command failed');
    const command: Command<never> = {
      name: 'FailingCommand',
      execute: vi.fn().mockRejectedValue(error),
    };
    const runner = new CommandRunner();

    await expect(runner.execute(command)).rejects.toBe(error);
  });
});
