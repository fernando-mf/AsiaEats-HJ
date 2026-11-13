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

      await expect(courier.assignments.accept(id)).rejects.toMatchObject({ status: 404 });
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

  describe('decline', () => {
    it('requeues the order and offers it to another courier', async () => {
      await purgeDatabase();
      const { orderId } = await createReadyOrder('o1');
      const courier = await putCourierOnline('courier1');
      const { id } = await getAssignmentByOrderId(orderId);
      const other = await putCourierOnline('courier2');

      await courier.assignments.decline(id);

      const after = await getAssignmentByOrderId(orderId);
      expect(after.status).toBe(AssignmentStatus.Offered);
      expect(after.courierId).toBe((await other.couriers.me()).account.id);
    });

    it('does not offer the order again to the courier who declined it', async () => {
      await purgeDatabase();
      const { orderId } = await createReadyOrder('o1');
      const courier = await putCourierOnline('courier1');
      const { id } = await getAssignmentByOrderId(orderId);

      await courier.assignments.decline(id);
      await courier.couriers.goOffline();
      await courier.couriers.goOnline();

      const after = await getAssignmentByOrderId(orderId);
      expect(after.status).toBe(AssignmentStatus.Queued);
      expect(after.courierId).toBeNull();
    });
  });

  describe('pickup', () => {
    it('moves the order to picked up and the courier to carrying', async () => {
      await purgeDatabase();
      const { orderId } = await createReadyOrder('o1');
      const courier = await putCourierOnline('courier1');
      const { id } = await getAssignmentByOrderId(orderId);
      await courier.assignments.accept(id);

      await courier.assignments.pickUp(id);

      expect((await courier.couriers.me()).status).toBe(CourierStatus.Carrying);
      expect((await courier.couriers.assignment()).order.status).toBe('picked_up');
      await expect(courier.couriers.goOffline()).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('courier going offline', () => {
    it('requeues an offered order and offers it to another courier', async () => {
      await purgeDatabase();
      const { orderId } = await createReadyOrder('o1');
      const courier = await putCourierOnline('courier1');
      const other = await putCourierOnline('courier2');

      await courier.couriers.goOffline();

      const after = await getAssignmentByOrderId(orderId);
      expect(after.status).toBe(AssignmentStatus.Offered);
      expect(after.courierId).toBe((await other.couriers.me()).account.id);
    });

    it('keeps an offered order queued when no courier is available', async () => {
      await purgeDatabase();
      const { orderId } = await createReadyOrder('o1');
      const courier = await putCourierOnline('courier1');

      await courier.couriers.goOffline();

      const after = await getAssignmentByOrderId(orderId);
      expect(after.status).toBe(AssignmentStatus.Queued);
      expect(after.courierId).toBeNull();
    });

    it('stalls an accepted order and does not retry it', async () => {
      await purgeDatabase();
      const { orderId } = await createReadyOrder('o1');
      const courier = await putCourierOnline('courier1');
      await courier.assignments.accept((await getAssignmentByOrderId(orderId)).id);

      await courier.couriers.goOffline();
      const other = await putCourierOnline('courier2');

      const after = await getAssignmentByOrderId(orderId);
      expect(after.status).toBe(AssignmentStatus.Stalled);
      expect(after.courierId).toBe((await courier.couriers.me()).account.id);
      expect((await other.couriers.me()).status).toBe(CourierStatus.Idle);
    });
  });

  describe('deliver', () => {
    it('rejects an order that was not picked up', async () => {
      await purgeDatabase();
      const { orderId } = await createReadyOrder('o1');
      const courier = await putCourierOnline('courier1');
      const { id } = await getAssignmentByOrderId(orderId);
      await courier.assignments.accept(id);

      await expect(courier.assignments.deliver(id)).rejects.toMatchObject({ status: 409 });
    });

    it('delivers the order, frees the courier and offers the next queued order', async () => {
      await purgeDatabase();
      const first = await createReadyOrder('o1');
      const courier = await putCourierOnline('courier1');
      const { id } = await getAssignmentByOrderId(first.orderId);
      await courier.assignments.accept(id);
      await courier.assignments.pickUp(id);
      const second = await createReadyOrder('o2');
      expect((await getAssignmentByOrderId(second.orderId)).status).toBe(AssignmentStatus.Queued);

      await courier.assignments.deliver(id);

      const next = await getAssignmentByOrderId(second.orderId);
      expect(next.status).toBe(AssignmentStatus.Offered);
      expect(next.courierId).toBe((await courier.couriers.me()).account.id);
      await expect(courier.assignments.deliver(id)).rejects.toMatchObject({ status: 409 });
    });

    it('keeps the delivered assignment as history', async () => {
      await purgeDatabase();
      const { orderId } = await createReadyOrder('o1');
      const courier = await putCourierOnline('courier1');
      const { id } = await getAssignmentByOrderId(orderId);
      await courier.assignments.accept(id);
      await courier.assignments.pickUp(id);

      await courier.assignments.deliver(id);

      const delivered = await courier.assignments.list({ status: AssignmentStatus.Delivered });
      expect(delivered.map(a => a.orderId)).toEqual([orderId]);
    });
  });

  describe('reassign', () => {
    it('rejects an assignment that is not stalled', async () => {
      await purgeDatabase();
      const { orderId } = await createReadyOrder('o1');
      const { id } = await getAssignmentByOrderId(orderId);
      const operator = new Client();
      await openSessionAsOperator(operator);

      await expect(operator.assignments.reassign(id)).rejects.toMatchObject({ status: 409 });
    });

    it('offers a stalled order to an available courier', async () => {
      await purgeDatabase();
      const { orderId } = await createReadyOrder('o1');
      const courier = await putCourierOnline('courier1');
      await courier.assignments.accept((await getAssignmentByOrderId(orderId)).id);
      await courier.couriers.goOffline();
      const other = await putCourierOnline('courier2');
      const operator = new Client();
      await openSessionAsOperator(operator);
      const { id } = await getAssignmentByOrderId(orderId);

      const reassigned = await operator.assignments.reassign(id);

      expect(reassigned.status).toBe(AssignmentStatus.Offered);
      expect(reassigned.courierId).toBe((await other.couriers.me()).account.id);
    });

    it('keeps the order queued when no courier is available', async () => {
      await purgeDatabase();
      const { orderId } = await createReadyOrder('o1');
      await stallAssignment(orderId);
      const operator = new Client();
      await openSessionAsOperator(operator);
      const { id } = await getAssignmentByOrderId(orderId);

      const reassigned = await operator.assignments.reassign(id);

      expect(reassigned.status).toBe(AssignmentStatus.Queued);
      expect(reassigned.courierId).toBeNull();
    });
  });

  describe('order cancellation', () => {
    it('deletes a queued assignment', async () => {
      await purgeDatabase();
      const { orderId } = await createReadyOrder('o1');
      const operator = new Client();
      await openSessionAsOperator(operator);

      await operator.orders.cancel(orderId);

      expect(await operator.assignments.list()).toEqual([]);
    });

    it('keeps an offered courier idle', async () => {
      await purgeDatabase();
      const { orderId } = await createReadyOrder('o1');
      const courier = await putCourierOnline('courier1');
      const operator = new Client();
      await openSessionAsOperator(operator);

      await operator.orders.cancel(orderId);

      expect(await operator.assignments.list()).toEqual([]);
      expect((await courier.couriers.me()).status).toBe(CourierStatus.Idle);
    });

    it('frees a courier who carries the order', async () => {
      await purgeDatabase();
      const { orderId } = await createReadyOrder('o1');
      const courier = await putCourierOnline('courier1');
      const { id } = await getAssignmentByOrderId(orderId);
      await courier.assignments.accept(id);
      await courier.assignments.pickUp(id);
      const operator = new Client();
      await openSessionAsOperator(operator);

      await operator.orders.cancel(orderId);

      expect(await operator.assignments.list()).toEqual([]);
      expect((await courier.couriers.me()).status).toBe(CourierStatus.Idle);
    });
  });
});
