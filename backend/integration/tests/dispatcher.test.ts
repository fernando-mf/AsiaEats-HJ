import { describe, expect, it } from 'vitest';
import { CourierStatus } from '#domain/reg/index.js';
import { createReadyOrder, purgeDatabase, putCourierOnline } from './helpers.ts';

// A courier that was offered an order is reserved, so its status shows whether an offer happened.
async function statusOf(courier: Awaited<ReturnType<typeof putCourierOnline>>) {
  return (await courier.couriers.me()).status;
}

describe('dispatcher retry', () => {
  it('offers a queued order when a courier goes online', async () => {
    await purgeDatabase();

    await createReadyOrder('a');

    const courier = await putCourierOnline('courier1');

    expect(await statusOf(courier)).toBe(CourierStatus.Assigned);
  });

  it('does nothing when the queue is empty', async () => {
    await purgeDatabase();

    const courier = await putCourierOnline('courier1');

    expect(await statusOf(courier)).toBe(CourierStatus.Idle);
  });

  it('stops retrying once no idle courier is left', async () => {
    await purgeDatabase();

    await createReadyOrder('first');
    await createReadyOrder('second');
    await createReadyOrder('third');

    const courier1 = await putCourierOnline('courier1');
    const courier2 = await putCourierOnline('courier2');

    expect(await statusOf(courier1)).toBe(CourierStatus.Assigned);
    expect(await statusOf(courier2)).toBe(CourierStatus.Assigned);
  });

  // TODO(#121): once assignments can be listed, assert that the oldest queued order is offered first.
  it.todo('offers the oldest queued order first when only one courier is available');

  // TODO(stalled-order task): once an assignment can be stalled through the API, assert it is not retried.
  it.todo('does not retry a stalled order');

  // TODO(#123): once a delivery can be completed through the API, assert a queued order is offered then.
  it.todo('offers a queued order when a courier finishes a delivery');
});
