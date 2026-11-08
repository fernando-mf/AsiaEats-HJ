import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { AccountRole } from '#domain/reg/index.js';
import { Client } from '../client/client.ts';

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
});
