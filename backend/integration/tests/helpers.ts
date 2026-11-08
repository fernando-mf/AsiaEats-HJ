import { PrismaPg } from '@prisma/adapter-pg';
import { AccountRole } from '#domain/reg/index.js';
import type { CourierResponse } from '#application/controllers/responses.dto.js';
import { PrismaClient } from '#infrastructure/generated/prisma/client.js';
import type { Client } from '../client/client.ts';

export async function createCourier(client: Client, username: string): Promise<CourierResponse> {
  const password = 'password123';
  await client.accounts.create({ role: AccountRole.Courier, username, password, name: `Test ${username}` });
  await client.accounts.login({ username, password });
  return client.couriers.me();
}

export async function openSessionAsCourier(client: Client) {
  await createCourier(client, 'courier');
}

export async function openSessionAsOperator(client: Client) {
  const password = 'password123';
  const username = 'operator';
  const account = await client.accounts.create({
    role: AccountRole.Operator,
    username,
    password,
    name: `Test operator`,
  });
  await client.accounts.login({ username, password });
  return account;
}

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
