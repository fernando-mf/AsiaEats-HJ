import { Injectable } from '@nestjs/common';
import { Account, AccountRepository, AccountRole } from '#domain/reg/index.js';
import { DuplicateEntityError, InternalError } from '#domain/errors.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';

// Postgres unique constraint violation, as reported by Prisma.
const UNIQUE_VIOLATION = 'P2002';

@Injectable()
export class PrismaAccountRepository extends AccountRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }

  async create(account: Account): Promise<Account> {
    try {
      const row = await this.db.account.create({
        data: {
          name: account.name,
          username: account.username,
          role: account.role,
          passwordHash: account.passwordHash,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
        },
      });

      account.id = row.id;

      return account;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === UNIQUE_VIOLATION) {
        throw new DuplicateEntityError('account');
      }
      throw new InternalError(err as Error);
    }
  }
}
