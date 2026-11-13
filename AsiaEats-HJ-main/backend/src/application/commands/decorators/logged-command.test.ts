import { describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '#domain/errors.js';
import { AccountRole } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';
import { AuthorizedCommand } from './authorized-command.js';
import { LoggedCommand, type CommandLogger } from './logged-command.js';

function createLogger(): CommandLogger {
  return {
    log: vi.fn(),
    error: vi.fn(),
  };
}

describe('LoggedCommand', () => {
  it('logs and propagates a denied authorization without executing the concrete command', async () => {
    const execute = vi.fn();
    const wrapped: Command<void> = {
      name: 'AcceptOrderCommand',
      execute,
    };
    const actor = { id: 'customer-1', role: AccountRole.Customer };
    const authorized = new AuthorizedCommand(wrapped, actor, [AccountRole.Restaurant]);
    const executeAuthorized = authorized.execute.bind(authorized);
    let authorizationError: unknown;
    vi.spyOn(authorized, 'execute').mockImplementation(async () => {
      try {
        return await executeAuthorized();
      } catch (error) {
        authorizationError = error;
        throw error;
      }
    });
    const logger = createLogger();
    const logged = new LoggedCommand(authorized, logger, actor);
    let propagatedError: unknown;

    expect(authorized.name).toBe('AcceptOrderCommand');
    expect(logged.name).toBe('AcceptOrderCommand');
    try {
      await logged.execute();
    } catch (error) {
      propagatedError = error;
    }

    expect(propagatedError).toBeInstanceOf(ForbiddenError);
    expect(propagatedError).toBe(authorizationError);
    expect(execute).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      'command=AcceptOrderCommand status=error errorCode=forbidden actorId=customer-1 actorRole=customer',
    );
  });

  it('preserves the command name and logs success with an actor', async () => {
    const result = { accepted: true };
    const wrapped: Command<typeof result> = {
      name: 'AcceptOrderCommand',
      execute: vi.fn().mockResolvedValue(result),
    };
    const logger = createLogger();
    const command = new LoggedCommand(wrapped, logger, {
      id: 'restaurant-1',
      role: AccountRole.Restaurant,
    });

    expect(command.name).toBe('AcceptOrderCommand');
    await expect(command.execute()).resolves.toBe(result);
    expect(logger.log).toHaveBeenCalledWith(
      'command=AcceptOrderCommand status=success actorId=restaurant-1 actorRole=restaurant',
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs success without actor information when no actor is available', async () => {
    const wrapped: Command<void> = {
      name: 'CreateAccountCommand',
      execute: vi.fn().mockResolvedValue(undefined),
    };
    const logger = createLogger();
    const command = new LoggedCommand(wrapped, logger);

    await command.execute();

    expect(logger.log).toHaveBeenCalledWith('command=CreateAccountCommand status=success');
  });

  it('logs failure and rethrows the exact original error', async () => {
    const error = new Error('account creation failed');
    const wrapped: Command<never> = {
      name: 'CreateAccountCommand',
      execute: vi.fn().mockRejectedValue(error),
    };
    const logger = createLogger();
    const command = new LoggedCommand(wrapped, logger);

    await expect(command.execute()).rejects.toBe(error);
    expect(logger.error).toHaveBeenCalledWith('command=CreateAccountCommand status=error errorCode=Error');
    expect(logger.log).not.toHaveBeenCalled();
  });
});
