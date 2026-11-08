import { describe, expect, it, vi } from 'vitest';
import { ForbiddenError, InvalidParamsError } from '#domain/errors.js';
import type { EventsService } from '#domain/events/index.js';
import type { DefaultAccountCreationHandler } from './accounts.handlers.js';
import { hashPassword, verifyPassword } from './accounts.helpers.js';
import {
  Account,
  AccountCreationRequest,
  AccountRole,
  AccountUpdateRequest,
  PasswordChangeRequest,
} from './accounts.models.js';
import { type AccountRepository, AccountsService } from './accounts.service.js';

async function existingAccount() {
  const account = new Account();
  account.id = 'account-1';
  account.name = 'Alice Chen';
  account.username = 'alice';
  account.role = AccountRole.Customer;
  account.passwordHash = await hashPassword('password123');
  account.createdAt = new Date();
  account.updatedAt = account.createdAt;
  return account;
}

function newService(stored?: Account) {
  const create = vi.fn(async (account: Account) => Object.assign(account, { id: 'account-1' }));
  const update = vi.fn(async (account: Account) => account);
  const getById = vi.fn(async () => stored!);
  const repository = { create, update, getById } as unknown as AccountRepository;
  const defaultHandler = { handleAccountCreation: vi.fn() } as unknown as DefaultAccountCreationHandler;
  const publish = vi.fn();
  const events = { publish } as unknown as EventsService;

  return { service: new AccountsService(repository, [], defaultHandler, events), create, update, publish };
}

const actor = { id: 'account-1', role: AccountRole.Customer };

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

describe('AccountsService.update', () => {
  it('saves the trimmed name and publishes account.updated', async () => {
    const { service, update, publish } = newService(await existingAccount());

    const account = await service.update(actor, AccountUpdateRequest.initialize({ name: '  Alice Wong  ' }));

    expect(account.name).toBe('Alice Wong');
    expect(update).toHaveBeenCalledOnce();
    expect(publish.mock.calls[0][0].eventType).toBe('account.updated');
  });

  it('refuses a name shorter than 3 characters', async () => {
    const { service, update } = newService(await existingAccount());

    await expect(service.update(actor, AccountUpdateRequest.initialize({ name: 'Al' }))).rejects.toBeInstanceOf(
      InvalidParamsError,
    );
    expect(update).not.toHaveBeenCalled();
  });
});

describe('AccountsService.changePassword', () => {
  const change = (currentPassword: string, newPassword: string) =>
    PasswordChangeRequest.initialize({ currentPassword, newPassword });

  it('replaces the password when the current one is right', async () => {
    const { service, publish } = newService(await existingAccount());

    const account = await service.changePassword(actor, change('password123', 'new-password-456'));

    await expect(verifyPassword('new-password-456', account.passwordHash)).resolves.toBe(true);
    await expect(verifyPassword('password123', account.passwordHash)).resolves.toBe(false);
    expect(publish.mock.calls[0][0].eventType).toBe('account.password_changed');
    expect(publish.mock.calls[0][0].payload).toEqual({});
  });

  it('refuses a wrong current password', async () => {
    const { service, update } = newService(await existingAccount());

    await expect(service.changePassword(actor, change('wrong-password', 'new-password-456'))).rejects.toBeInstanceOf(
      InvalidParamsError,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses a new password that is too short or unchanged', async () => {
    const { service, update } = newService(await existingAccount());

    await expect(service.changePassword(actor, change('password123', 'short'))).rejects.toBeInstanceOf(
      InvalidParamsError,
    );
    await expect(service.changePassword(actor, change('password123', 'password123'))).rejects.toBeInstanceOf(
      InvalidParamsError,
    );
    expect(update).not.toHaveBeenCalled();
  });
});
