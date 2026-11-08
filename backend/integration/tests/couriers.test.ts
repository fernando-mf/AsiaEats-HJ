import { describe, expect, it } from 'vitest';
import { AccountRole } from '#domain/reg/index.js';
import { Client } from '../client/client.ts';
import { purgeDatabase } from './helpers.ts';
import { CourierResponse } from '#application/controllers/responses.dto.js';

describe('couriers', () => {
  describe('create', () => {
    it('success', async () => {
      const client = new Client();

      const username = `courier1`;
      const password = 'password123';

      await client.accounts.create({
        role: AccountRole.Courier,
        username,
        password,
        name: 'Test Courier',
      });

      await client.accounts.login({ username, password });
      const { id, createdAt, updatedAt, ...rest } = await client.accounts.me();

      expect(rest).toMatchInlineSnapshot(
        `
        {
          "name": "Test Courier",
          "role": "courier",
          "username": "courier1",
        }
      `,
      );
    });
  });

  describe('get me', () => {
    it('success', async () => {
      await purgeDatabase();

      const client = new Client();
      const username = 'courier2';
      const password = 'password123';

      await client.accounts.create({ role: AccountRole.Courier, username, password, name: 'Courier Two' });
      await client.accounts.login({ username, password });

      const courier = await client.couriers.me();
      expect(normalizeCourier(courier)).toMatchSnapshot();
    });
  });
});

function normalizeCourier(c: CourierResponse) {
  c.account.id = 'test';
  c.account.createdAt = new Date(2026, 1, 1);
  c.account.updatedAt = new Date(2026, 1, 1);
  c.createdAt = new Date(2026, 1, 1);
  c.updatedAt = new Date(2026, 1, 1);
  return c;
}
