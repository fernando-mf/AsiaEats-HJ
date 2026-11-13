import { describe, expect, it } from 'vitest';
import { AssignmentStatus } from '#domain/dlv/index.js';
import { CourierStatus } from '#domain/reg/index.js';
import { createReadyOrder, getAssignmentByOrderId, purgeDatabase, putCourierOnline } from './helpers.ts';

async function statusOf(courier: Awaited<ReturnType<typeof putCourierOnline>>) {
  return (await courier.couriers.me()).status;
}

describe('delivery retry', () => {
  it('offers a queued order when a courier goes online', async () => {
    await purgeDatabase();
    const { orderId } = await createReadyOrder('o1');
    expect((await getAssignmentByOrderId(orderId)).status).toBe(AssignmentStatus.Queued);

    const courier = await putCourierOnline('courier1');

    const assignment = await getAssignmentByOrderId(orderId);
    expect(assignment.status).toBe(AssignmentStatus.Offered);
    expect(assignment.courierId).toBe((await courier.couriers.me()).account.id);
  });

  it('does nothing when the queue is empty', async () => {
    await purgeDatabase();

    const courier = await putCourierOnline('courier1');

    expect(await statusOf(courier)).toBe(CourierStatus.Idle);
  });

  it('keeps an order queued while no courier is idle', async () => {
    await purgeDatabase();
    const first = await createReadyOrder('o1');
    const courier1 = await putCourierOnline('courier1');
    await courier1.assignments.accept((await getAssignmentByOrderId(first.orderId)).id);
    expect(await statusOf(courier1)).toBe(CourierStatus.Assigned);

    const second = await createReadyOrder('o2');
    expect((await getAssignmentByOrderId(second.orderId)).status).toBe(AssignmentStatus.Queued);

    const courier2 = await putCourierOnline('courier2');

    const assignment = await getAssignmentByOrderId(second.orderId);
    expect(assignment.status).toBe(AssignmentStatus.Offered);
    expect(assignment.courierId).toBe((await courier2.couriers.me()).account.id);
  });

  // TODO(#121): once assignments can be listed, assert that the oldest queued order is offered first.
  it.todo('offers the oldest queued order first when only one courier is available');

  // TODO(stalled-order task): once an assignment can be stalled through the API, assert it is not retried.
  it.todo('does not retry a stalled order');

  // TODO(delivery completion task): once a delivery can be completed through the API, assert a queued order is offered then.
  it.todo('offers a queued order when a courier finishes a delivery');
});
