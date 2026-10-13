import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Account, AccountRepository } from '#domain/reg/index.js';

@Injectable()
export class LocalAccountRepository extends AccountRepository {
  private readonly accounts = new Map<string, Account>();

  create(request: Account): Promise<Account> {
    request.id = randomUUID();
    this.accounts.set(request.id, request);

    console.log('account created', request.toJSON());

    return Promise.resolve(request);
  }
}
