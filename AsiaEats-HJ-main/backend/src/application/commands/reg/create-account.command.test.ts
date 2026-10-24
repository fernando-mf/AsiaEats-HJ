import { describe, expect, it, vi } from 'vitest';
import { AccountRole } from '#domain/reg/index.js';
import type { Account, AccountCreationRequest, AccountsService } from '#domain/reg/index.js';
import { CreateAccountCommand } from './create-account.command.js';

describe('CreateAccountCommand', () => {
  it('preserves its stable name and delegates account creation to AccountsService', async () => {
    const request = {
      name: 'Test Customer',
      username: 'customer',
      password: 'password',
      role: AccountRole.Customer,
    } as AccountCreationRequest;
    const account = { id: 'account-1' } as Account;
    const create = vi.fn().mockResolvedValue(account);
    const accountsService = { create } as unknown as AccountsService;
    const command = new CreateAccountCommand(accountsService, request);

    expect(command.name).toBe('CreateAccountCommand');
    await expect(command.execute()).resolves.toBe(account);
    expect(create).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith(request);
  });
});
