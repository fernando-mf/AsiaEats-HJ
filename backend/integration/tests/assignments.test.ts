import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { AssignmentStatus } from '#domain/dlv/index.js';
import { AccountRole, CourierStatus } from '#domain/reg/index.js';
import { Client } from '../client/client.ts';
import {
  createCourier,
  createReadyOrder,
  getAssignmentByOrderId,
  openSessionAsOperator,
  purgeDatabase,
  putCourierOnline,
  stallAssignment,
} from './helpers.ts';

describe('order assignments', () => {
  describe('list', () => {
    it('rejects a caller who is not signed in', async () => {
      await purgeDatabase();

      await expect(new Client().assignments.list()).rejects.toMatchObject({ status: 401 });
    });

    it('lets the operator list every assignment, oldest first', async () => {
      await purgeDatabase();
      const first = await createReadyOrder('o1');
      const second = await createReadyOrder('o2');
      const operator = new Client();
      await openSessionAsOperator(operator);

      const list = await operator.assignments.list();

      expect(list.map(a => a.orderId)).toEqual([first.orderId, second.orderId]);
    });

    it('filters by status', async () => {
      await purgeDatabase();
      const queued = await createReadyOrder('o1');
      const stalled = await createReadyOrder('o2');
      await stallAssignment(stalled.orderId);
      const operator = new Client();
      await openSessionAsOperator(operator);

      const queuedList = await operator.assignments.list({ status: AssignmentStatus.Queued });
      const stalledList = await operator.assignments.list({ status: AssignmentStatus.Stalled });
      const acceptedList = await operator.assignments.list({ status: AssignmentStatus.Accepted });

      expect(queuedList.map(a => a.orderId)).toEqual([queued.orderId]);
      expect(stalledList.map(a => a.orderId)).toEqual([stalled.orderId]);
      expect(acceptedList).toEqual([]);
    });

    it('filters by courier for the operator', async () => {
      await purgeDatabase();
      const { orderId } = await createReadyOrder('o1');
      await createReadyOrder('o2');
      const courier = await putCourierOnline('courier1');
      const courierId = (await courier.couriers.me()).account.id;
      const operator = new Client();
      await openSessionAsOperator(operator);

      const list = await operator.assignments.list({ courierId });

      expect(list.map(a => a.orderId)).toEqual([orderId]);
    });
  });

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
