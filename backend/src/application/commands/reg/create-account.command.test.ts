import { describe, expect, it, vi } from 'vitest';
import { AccountRole } from '#domain/reg/index.js';
import type { Account, AccountCreationRequest, AccountsService } from '#domain/reg/index.js';
import { CreateAccountCommand } from './create-account.command.js';

describe('CreateAccountCommand', () => {
  it('preserves its stable name and delegates to the public registration of AccountsService', async () => {
    const request = {
      name: 'Test Customer',
      username: 'customer',
      password: 'password',
      role: AccountRole.Customer,
    } as AccountCreationRequest;
    const account = { id: 'account-1' } as Account;
    const register = vi.fn().mockResolvedValue(account);
    const accountsService = { register } as unknown as AccountsService;
    const command = new CreateAccountCommand(accountsService, request);

    expect(command.name).toBe('CreateAccountCommand');
    await expect(command.execute()).resolves.toBe(account);
    expect(register).toHaveBeenCalledOnce();
    expect(register).toHaveBeenCalledWith(request);
  });
});
