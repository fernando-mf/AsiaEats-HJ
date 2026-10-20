import { Injectable } from '@nestjs/common';
import { Account, AccountRepository, AccountRole } from '#domain/reg/index.js';
import { DuplicateEntityError, InternalError, NotFoundError } from '#domain/errors.js';
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

  async findByUsername(username: string): Promise<Account> {
    const row = await this.db.account.findUnique({ where: { username } });
    if (!row) {
      throw new NotFoundError('account');
    }

    const account = new Account();
    account.id = row.id;
    account.name = row.name;
    account.username = row.username;
    account.role = row.role as AccountRole;
    account.passwordHash = row.passwordHash;
    account.createdAt = row.createdAt;
    account.updatedAt = row.updatedAt;
    return account;
  }
}
