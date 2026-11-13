import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { AssignmentStatus } from '#domain/dlv/index.js';
import { CourierStatus } from '#domain/reg/index.js';
import { Client } from '../client/client.ts';
import { createCourier, createReadyOrder, getAssignmentByOrderId, purgeDatabase, putCourierOnline } from './helpers.ts';

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

    it('rejects a courier who already holds an order', async () => {
      await purgeDatabase();
      const first = await createReadyOrder('o1');
      const second = await createReadyOrder('o2');
      const courier = await putCourierOnline('courier1');
      await courier.assignments.accept((await getAssignmentByOrderId(first.orderId)).id);
      const { id } = await getAssignmentByOrderId(second.orderId);

      await expect(courier.assignments.accept(id)).rejects.toMatchObject({ status: 409 });
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
});
