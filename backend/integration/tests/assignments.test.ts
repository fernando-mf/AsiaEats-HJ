import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { AssignmentStatus } from '#domain/dlv/index.js';
import { CourierStatus } from '#domain/reg/index.js';
import { Client } from '../client/client.ts';
import {
  createCourier,
  createReadyOrder,
  getAssignmentByOrderId,
  openSessionAsOperator,
  purgeDatabase,
  putCourierOnline,
} from './helpers.ts';

describe('order assignments', () => {
  describe('accept', () => {
    it('rejects an assignment that does not exist', async () => {
      await purgeDatabase();

      const client = new Client();
      await createCourier(client, 'courier1');

      await expect(client.assignments.accept(randomUUID())).rejects.toMatchObject({ status: 404 });
    });

    it('binds the order to the courier it was offered to', async () => {
      await purgeDatabase();
      const { orderId } = await createReadyOrder('o1');
      const courier = await putCourierOnline('courier1');
      const offered = await getAssignmentByOrderId(orderId);

      const accepted = await courier.assignments.accept(offered.id);

      expect(accepted.status).toBe(AssignmentStatus.Accepted);
      expect((await getAssignmentByOrderId(orderId)).status).toBe(AssignmentStatus.Accepted);
      expect((await courier.couriers.me()).status).toBe(CourierStatus.Assigned);
    });

    it('rejects a courier who went offline', async () => {
      await purgeDatabase();
      const { orderId } = await createReadyOrder('o1');
      const courier = await putCourierOnline('courier1');
      const { id } = await getAssignmentByOrderId(orderId);

      await courier.couriers.goOffline();

      await expect(courier.assignments.accept(id)).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('current assignment', () => {
    it('is not found when nothing was offered', async () => {
      await purgeDatabase();
      const client = new Client();
      await createCourier(client, 'courier1');

      await expect(client.couriers.assignment()).rejects.toMatchObject({ status: 404 });
    });

    it('returns the offered assignment with its order and restaurant', async () => {
      await purgeDatabase();
      const { orderId } = await createReadyOrder('o1');
      const courier = await putCourierOnline('courier1');
      const offered = await getAssignmentByOrderId(orderId);

      const assignment = await courier.couriers.assignment();

      expect(assignment).toMatchObject({
        id: offered.id,
        status: AssignmentStatus.Offered,
        order: { id: orderId, lines: [{ name: 'Dumplings', quantity: 1 }] },
        restaurant: { name: 'o1 restaurant' },
      });
    });
  });
});
