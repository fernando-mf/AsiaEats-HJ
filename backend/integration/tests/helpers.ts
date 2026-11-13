import { PrismaPg } from '@prisma/adapter-pg';
import type { Assignment } from '#domain/dlv/index.js';
import { RestaurantStatus } from '#domain/ord/index.js';
import { AccountRole } from '#domain/reg/index.js';
import { hashPassword } from '#domain/reg/accounts.helpers.js';
import type { CourierResponse } from '#application/controllers/responses.dto.js';
import { PrismaClient } from '#infrastructure/generated/prisma/client.js';
import { Client } from '../client/client.ts';

export async function createCourier(client: Client, username: string): Promise<CourierResponse> {
  const password = 'password123';
  await client.accounts.create({ role: AccountRole.Courier, username, password, name: `Test ${username}` });
  await client.accounts.login({ username, password });
  return client.couriers.me();
}

export async function openSessionAsCourier(client: Client) {
  await createCourier(client, 'courier');
}

// Operator accounts can't be registered through the API (they are predefined, like the seed's),
// so the test operator is inserted straight into the database and then signs in normally.
export async function openSessionAsOperator(client: Client) {
  const password = 'password123';
  const username = 'operator';
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const now = new Date();
    await db.account.create({
      data: {
        name: 'Test operator',
        username,
        role: AccountRole.Operator,
        passwordHash: await hashPassword(password),
        createdAt: now,
        updatedAt: now,
      },
    });
  } finally {
    await db.$disconnect();
  }
  await client.accounts.login({ username, password });
  return client.accounts.me();
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

const RESTAURANT_POSITION = { latitude: 45.5, longitude: -73.56 };

export async function createReadyOrder(name: string): Promise<{ orderId: string }> {
  const password = 'password123';

  const restaurantClient = new Client();
  await restaurantClient.accounts.create({
    role: AccountRole.Restaurant,
    username: `${name}-owner`,
    password,
    name: `${name} owner`,
  });
  await restaurantClient.accounts.login({ username: `${name}-owner`, password });
  const restaurant = await restaurantClient.restaurants.create({
    name: `${name} restaurant`,
    status: RestaurantStatus.Open,
    position: RESTAURANT_POSITION,
  });
  const item = await restaurantClient.restaurants.createMenuItem(restaurant.id, { name: 'Dumplings', price: 9.5 });

  const customerClient = new Client();
  await customerClient.accounts.create({
    role: AccountRole.Customer,
    username: `${name}-customer`,
    password,
    name: `${name} customer`,
  });
  await customerClient.accounts.login({ username: `${name}-customer`, password });
  await customerClient.customers.update({
    address: { street: '1 Main St', city: 'Montreal', postalCode: 'H1H1H1', ...RESTAURANT_POSITION },
  });
  const order = await customerClient.orders.place({
    restaurantId: restaurant.id,
    items: [{ menuItemId: item.id, quantity: 1 }],
  });

  await restaurantClient.orders.accept(order.id);
  await restaurantClient.orders.prepare(order.id);
  await restaurantClient.orders.ready(order.id);

  return { orderId: order.id };
}

// TODO(#121, #122): assignments aren't exposed through the API yet, so tests read them straight from the database.
// Replace with the assignments API once available.
export async function getAssignmentByOrderId(orderId: string): Promise<Assignment> {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const row = await db.deliveryAssignment.findUniqueOrThrow({ where: { orderId } });
    return row as Assignment;
  } finally {
    await db.$disconnect();
  }
}

export async function putCourierOnline(username: string): Promise<Client> {
  const client = new Client();
  await createCourier(client, username);
  await client.couriers.updatePosition({ position: RESTAURANT_POSITION });
  await client.couriers.goOnline();
  return client;
}
