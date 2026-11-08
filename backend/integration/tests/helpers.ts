import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '#infrastructure/generated/prisma/client.js';

export async function purgeDatabase(): Promise<void> {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const tables = await db.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations'
    `;
    if (tables.length === 0) {
      return;
    }

    const list = tables.map(t => `"${t.tablename}"`).join(', ');
    await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  } finally {
    await db.$disconnect();
  }
}
