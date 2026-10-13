import { Injectable } from '@nestjs/common';
import { AccountCreationRequest, Account } from './accounts.models.js';

export abstract class AccountRepository {
  abstract create(request: Account): Promise<Account>;
}

@Injectable()
export class AccountsService {
  constructor(private readonly accounts: AccountRepository) {}

  create(request: AccountCreationRequest): Promise<Account> {
    const account = new Account();
    return this.accounts.create(account);
  }
}
