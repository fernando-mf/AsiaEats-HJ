import { Inject, Injectable } from '@nestjs/common';
import { validate } from 'class-validator';
import { AccountCreationRequest, Account, LoginRequest } from './accounts.models.js';
import {
  ACCOUNT_CREATION_HANDLERS,
  type AccountCreationHandler,
  DefaultAccountCreationHandler,
} from './accounts.handlers.js';
import { hashPassword, verifyPassword } from './accounts.helpers.js';
import { InvalidParamsError, UnauthenticatedError } from '#domain/errors.js';

export abstract class AccountRepository {
  abstract create(request: Account): Promise<Account>;
  abstract getByUsername(username: string): Promise<Account>;
  abstract getById(id: string): Promise<Account>;
}

@Injectable()
export class AccountsService {
  constructor(
    private readonly accounts: AccountRepository,
    @Inject(ACCOUNT_CREATION_HANDLERS) private readonly handlers: AccountCreationHandler[],
    private readonly defaultHandler: DefaultAccountCreationHandler,
  ) {}

  async create(request: AccountCreationRequest): Promise<Account> {
    const errors = await validate(request);
    if (errors.length > 0) {
      throw InvalidParamsError.fromClassValidator(errors);
    }

    const now = new Date();

    const account = new Account();
    account.name = request.name;
    account.username = request.username;
    account.role = request.role;
    account.passwordHash = await hashPassword(request.password);
    account.createdAt = now;
    account.updatedAt = now;

    const created = await this.accounts.create(account);

    await this.onCreated(created);

    return created;
  }

  // onCreated delegates the rest of the account creation process to the specialized role handlers.
  private async onCreated(account: Account): Promise<void> {
    const handler = this.handlers.find(h => h.role === account.role) ?? this.defaultHandler;
    await handler.handleAccountCreation(account);
  }

  async login(request: LoginRequest): Promise<Account> {
    const errors = await validate(request);
    if (errors.length > 0) {
      throw InvalidParamsError.fromClassValidator(errors);
    }

    const account = await this.accounts.getByUsername(request.username);

    const valid = await verifyPassword(request.password, account.passwordHash);
    if (!valid) {
      throw new UnauthenticatedError('invalid credentials');
    }

    return account;
  }

  getById(id: string): Promise<Account> {
    return this.accounts.getById(id);
  }
}
