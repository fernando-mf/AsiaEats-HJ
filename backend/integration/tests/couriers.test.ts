import { describe, expect, it } from 'vitest';
import { AccountRole, CourierStatus } from '#domain/reg/index.js';
import { Client } from '../client/client.ts';
import { createCourier, openSessionAsCourier, openSessionAsOperator, purgeDatabase } from './helpers.ts';
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

  describe('list', () => {
    it('operator lists couriers, optionally filtered by status', async () => {
      await purgeDatabase();

      const client = new Client();

      await createCourier(client, 'courier1');
      await createCourier(client, 'courier2');
      await createCourier(client, 'courier3');
      await createCourier(client, 'courier4');

      await openSessionAsOperator(client);

      const all = await client.couriers.list();
      expect(all).toHaveLength(4);
      expect(all.every(c => c.status === CourierStatus.Offline)).toBe(true);
    });
  });

  describe('updatePosition', () => {
    it('success', async () => {
      await purgeDatabase();

      const client = new Client();
      await openSessionAsCourier(client);

      const courier = await client.couriers.updatePosition({ position: { latitude: 45.5, longitude: -73.5 } });

      expect(courier.position).toEqual({ latitude: 45.5, longitude: -73.5 });
    });
  });

  describe('goOnline / goOffline', () => {
    it('goes online then offline', async () => {
      await purgeDatabase();

      const client = new Client();
      await openSessionAsCourier(client);

      await client.couriers.goOnline();
      expect((await client.couriers.me()).status).toBe(CourierStatus.Idle);

      // going online again changes nothing
      await client.couriers.goOnline();
      expect((await client.couriers.me()).status).toBe(CourierStatus.Idle);

      await client.couriers.goOffline();
      expect((await client.couriers.me()).status).toBe(CourierStatus.Offline);

      // going offline again changes nothing
      await client.couriers.goOffline();
      expect((await client.couriers.me()).status).toBe(CourierStatus.Offline);
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
