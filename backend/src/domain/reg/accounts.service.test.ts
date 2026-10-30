import { describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '#domain/errors.js';
import type { DefaultAccountCreationHandler } from './accounts.handlers.js';
import { Account, AccountCreationRequest, AccountRole } from './accounts.models.js';
import { type AccountRepository, AccountsService } from './accounts.service.js';

function newService() {
  const create = vi.fn(async (account: Account) => Object.assign(account, { id: 'account-1' }));
  const repository = { create } as unknown as AccountRepository;
  const defaultHandler = { handleAccountCreation: vi.fn() } as unknown as DefaultAccountCreationHandler;

  return { service: new AccountsService(repository, [], defaultHandler), create };
}

function request(role: AccountRole): AccountCreationRequest {
  return AccountCreationRequest.initialize({ role, username: 'new-user', password: 'password123', name: 'New User' });
}

describe('AccountsService.register', () => {
  it('refuses to register an operator account', async () => {
    const { service, create } = newService();

    await expect(service.register(request(AccountRole.Operator))).rejects.toBeInstanceOf(ForbiddenError);
    expect(create).not.toHaveBeenCalled();
  });

  it.each([AccountRole.Customer, AccountRole.Restaurant, AccountRole.Courier])('registers a %s account', async role => {
    const { service, create } = newService();

    const account = await service.register(request(role));

    expect(create).toHaveBeenCalledOnce();
    expect(account.role).toBe(role);
  });
});
