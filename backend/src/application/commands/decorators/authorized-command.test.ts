import { describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '#domain/errors.js';
import { AccountRole } from '#domain/reg/index.js';
import type { Command } from '../command.js';
import { AuthorizedCommand } from './authorized-command.js';

describe('AuthorizedCommand', () => {
  it('preserves the command name and delegates exactly once for an allowed role', async () => {
    const result = { accepted: true };
    const execute = vi.fn().mockResolvedValue(result);
    const wrapped: Command<typeof result> = { name: 'AcceptOrderCommand', execute };
    const command = new AuthorizedCommand(wrapped, { id: 'restaurant-1', role: AccountRole.Restaurant }, [
      AccountRole.Restaurant,
    ]);

    expect(command.name).toBe('AcceptOrderCommand');
    await expect(command.execute()).resolves.toBe(result);
    expect(execute).toHaveBeenCalledOnce();
  });

  it('throws ForbiddenError without executing the command for a disallowed role', async () => {
    const execute = vi.fn();
    const wrapped: Command<void> = { name: 'AcceptOrderCommand', execute };
    const command = new AuthorizedCommand(wrapped, { id: 'customer-1', role: AccountRole.Customer }, [
      AccountRole.Restaurant,
    ]);

    await expect(command.execute()).rejects.toBeInstanceOf(ForbiddenError);
    expect(execute).not.toHaveBeenCalled();
  });
});
