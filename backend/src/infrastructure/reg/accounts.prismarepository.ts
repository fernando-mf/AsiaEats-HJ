import { Injectable } from '@nestjs/common';
import { Account, AccountRepository, AccountRole } from '#domain/reg/index.js';
import { DuplicateEntityError, InternalError } from '#domain/errors.js';
import { PrismaService } from '../prisma.service.js';

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
      if (this.db.isUniqueViolation(err)) {
        throw new DuplicateEntityError('account');
      }
      throw new InternalError(err as Error);
    }
  }
}
