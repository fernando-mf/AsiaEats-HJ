import { Injectable } from '@nestjs/common';
import { Account, AccountRepository, AccountRole } from '#domain/reg/index.js';
import { DuplicateEntityError, InternalError, NotFoundError } from '#domain/errors.js';
import { PrismaService } from '#infrastructure/prisma.service.js';

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

  async getByUsername(username: string): Promise<Account> {
    const row = await this.db.account.findUnique({ where: { username } });
    if (!row) {
      throw new NotFoundError('account');
    }
    return this.toAccount(row);
  }

  async getById(id: string): Promise<Account> {
    const row = await this.db.account.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundError('account');
    }
    return this.toAccount(row);
  }

  private toAccount(row: {
    id: string;
    name: string;
    username: string;
    role: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
  }): Account {
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
