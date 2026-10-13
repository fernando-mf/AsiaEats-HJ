import { BadRequestException, Injectable } from '@nestjs/common';
import { validate } from 'class-validator';
import { AccountCreationRequest, Account } from './accounts.models.js';
import { hashPassword } from './accounts.helpers.js';

export abstract class AccountRepository {
  abstract create(request: Account): Promise<Account>;
}

@Injectable()
export class AccountsService {
  constructor(private readonly accounts: AccountRepository) {}

  async create(request: AccountCreationRequest): Promise<Account> {
    const errors = await validate(request);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    const account = new Account();
    account.name = request.name;
    account.username = request.username;
    account.role = request.role;
    account.passwordHash = await hashPassword(request.password);

    return this.accounts.create(account);
  }
}
