import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Account, AccountRepository } from '#domain/reg/index.js';

@Injectable()
export class LocalAccountRepository extends AccountRepository {
  create(_request: Account): Promise<Account> {
    console.log('account created');
    const account = new Account();
    account.id = randomUUID();
    return Promise.resolve(account);
  }
}
