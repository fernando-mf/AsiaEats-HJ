import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from './generated/prisma/client.js';
import type { InfrastructureConfig } from './infrastructure.config.js';

// Postgres unique constraint violation as returned by Prisma.
const UNIQUE_VIOLATION = 'P2002';

// Postgres foreign key constraint violation as returned by Prisma.
const FOREIGN_KEY_VIOLATION = 'P2003';

const RECORD_NOT_FOUND = 'P2025';

// Limits for one unit of work. The environment reset re-seeds every account, restaurant and
// dish in a single transaction, so the timeout leaves room for that against a remote database.
const TRANSACTION_OPTIONS = { maxWait: 5_000, timeout: 30_000 };

// PrismaService provides access to our PostgreSQL database through Prisma Client.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  // The transaction client of the unit of work running in the current async context, if any.
  private readonly transaction = new AsyncLocalStorage<Prisma.TransactionClient>();

  constructor(config: ConfigService<InfrastructureConfig, true>) {
    const connectionString = config.get('DATABASE_URL', { infer: true });
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // client is what repositories query through: the running transaction's client inside a unit
  // of work, so their writes join it, and the shared client otherwise.
  //
  // It must stay a method. PrismaClient's constructor returns a wrapper object, and a getter
  // would see the bare inner object as `this`, which has no model delegates (`account`,
  // `order`, ...); a method called on the wrapper gets the wrapper.
  client(): Prisma.TransactionClient {
    return this.transaction.getStore() ?? this;
  }

  // runInTransaction runs work in one database transaction; work started inside an open one
  // joins it instead of opening a nested transaction.
  runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    if (this.transaction.getStore()) {
      return work();
    }
    return this.$transaction(tx => this.transaction.run(tx, work), TRANSACTION_OPTIONS);
  }

  // isUniqueViolation reports whether the query failed due to a unique constraint violation.
  isUniqueViolation(err: unknown): boolean {
    return err instanceof Prisma.PrismaClientKnownRequestError && err.code === UNIQUE_VIOLATION;
  }

  // isForeignKeyViolation reports whether the query failed due to a foreign key constraint violation.
  isForeignKeyViolation(err: unknown): boolean {
    return err instanceof Prisma.PrismaClientKnownRequestError && err.code === FOREIGN_KEY_VIOLATION;
  }

  // isRecordNotFound reports whether the query failed because no record matched the filter.
  isRecordNotFound(err: unknown): boolean {
    return err instanceof Prisma.PrismaClientKnownRequestError && err.code === RECORD_NOT_FOUND;
  }
}
