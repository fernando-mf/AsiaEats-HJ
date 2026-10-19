import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from './generated/prisma/client.js';
import type { InfrastructureConfig } from './infrastructure.config.js';

// Postgres unique constraint violation as returned by Prisma.
const UNIQUE_VIOLATION = 'P2002';

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
}
