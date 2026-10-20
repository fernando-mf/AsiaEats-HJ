import { Injectable } from '@nestjs/common';
import { validate } from 'class-validator';
import { AccountCreationRequest, Account, LoginRequest } from './accounts.models.js';
import { hashPassword, verifyPassword } from './accounts.helpers.js';
import { InvalidParamsError, UnauthenticatedError } from '#domain/errors.js';

export abstract class AccountRepository {
  abstract create(request: Account): Promise<Account>;
  abstract findByUsername(username: string): Promise<Account>;
}

@Injectable()
export class AccountsService {
  constructor(private readonly accounts: AccountRepository) {}

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

    return this.accounts.create(account);
  }

  async login(request: LoginRequest): Promise<Account> {
    const errors = await validate(request);
    if (errors.length > 0) {
      throw InvalidParamsError.fromClassValidator(errors);
    }

    const account = await this.accounts.findByUsername(request.username);

    const valid = await verifyPassword(request.password, account.passwordHash);
    if (!valid) {
      throw new UnauthenticatedError('invalid credentials');
    }

    return account;
  }
}
