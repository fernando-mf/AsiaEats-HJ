import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from './generated/prisma/client.js';
import type { InfrastructureConfig } from './infrastructure.config.js';

// Postgres unique constraint violation as returned by Prisma.
const UNIQUE_VIOLATION = 'P2002';

// Postgres foreign key constraint violation as returned by Prisma.
const FOREIGN_KEY_VIOLATION = 'P2003';

// PrismaService provides access to our PostgreSQL database through Prisma Client.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService<InfrastructureConfig, true>) {
    const connectionString = config.get('DATABASE_URL', { infer: true });
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // isUniqueViolation reports whether the query failed due to a unique constraint violation.
  isUniqueViolation(err: unknown): boolean {
    return err instanceof Prisma.PrismaClientKnownRequestError && err.code === UNIQUE_VIOLATION;
  }

  // isForeignKeyViolation reports whether the query failed due to a foreign key constraint violation.
  isForeignKeyViolation(err: unknown): boolean {
    return err instanceof Prisma.PrismaClientKnownRequestError && err.code === FOREIGN_KEY_VIOLATION;
  }
}
