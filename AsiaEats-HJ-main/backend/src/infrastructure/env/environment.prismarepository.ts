import { Injectable } from '@nestjs/common';
import { EnvironmentRepository } from '#domain/env/index.js';
import { InternalError } from '#domain/errors.js';
import { PrismaService } from '#infrastructure/prisma.service.js';

const MIGRATIONS_TABLE = '_prisma_migrations';

@Injectable()
export class PrismaEnvironmentRepository extends EnvironmentRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }

  // reset truncates every table of the current schema except the migrations history
  async reset(): Promise<void> {
    try {
      const tables = await this.db.$queryRaw<{ tablename: string }[]>`
        SELECT tablename FROM pg_tables
        WHERE schemaname = current_schema() AND tablename <> ${MIGRATIONS_TABLE}
      `;
      if (tables.length === 0) {
        return;
      }

      const list = tables.map(t => `"${t.tablename}"`).join(', ');
      await this.db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
    } catch (err) {
      throw new InternalError(err as Error);
    }
  }
}
