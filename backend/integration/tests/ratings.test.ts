import { describe, expect, it } from 'vitest';
import { OrderStatus } from '#domain/ord/index.js';
import { AccountRole } from '#domain/reg/index.js';
import { Client } from '../client/client.ts';
import {
  createPlacedOrder,
  getAssignmentByOrderId,
  getRatingsByOrderId,
  openSessionAsOperator,
  purgeDatabase,
  putCourierOnline,
} from './helpers.ts';

const scores = { restaurantRating: 5, courierRating: 4 };

type PlacedOrder = Awaited<ReturnType<typeof createPlacedOrder>>;

async function advanceTo(name: string, placed: PlacedOrder, status: OrderStatus, courier?: Client) {
  const { orderId, customerClient: customer, restaurantClient: restaurant } = placed;
  const order = { orderId, customer, restaurant, courierId: null as string | null };

  if (status === OrderStatus.Placed) return order;
  if (status === OrderStatus.Rejected) {
    await restaurant.orders.reject(orderId, { reason: 'Out of ingredients' });
    return order;
  }
  if (status === OrderStatus.Cancelled) {
    await customer.orders.cancel(orderId);
    return order;
  }

  await restaurant.orders.accept(orderId);
  if (status === OrderStatus.Accepted) return order;
  await restaurant.orders.prepare(orderId);
  if (status === OrderStatus.Preparing) return order;
  await restaurant.orders.ready(orderId);
  if (status === OrderStatus.Ready) return order;

  courier ??= await putCourierOnline(`${name}-courier`);
  const assignment = await getAssignmentByOrderId(orderId);
  await courier.assignments.accept(assignment.id);
  await courier.assignments.pickUp(assignment.id);
  if (status === OrderStatus.PickedUp) return order;
  await courier.assignments.deliver(assignment.id);
  order.courierId = assignment.courierId;
  if (status === OrderStatus.Delivered) return order;

  const operator = new Client();
  await openSessionAsOperator(operator);
  await operator.orders.refund(orderId);
  return order;
}

async function createOrderIn(name: string, status: OrderStatus) {
  return advanceTo(name, await createPlacedOrder(name), status);
}

describe('order rating', () => {
  describe('rate', () => {
    it('records the rating of a delivered order with its restaurant and courier', async () => {
      await purgeDatabase();
      const { orderId, customer, courierId } = await createOrderIn('o1', OrderStatus.Delivered);

      const rating = await customer.orders.rate(orderId, scores);

      expect(rating).toMatchObject({ orderId, courierId, ...scores });
      const stored = await getRatingsByOrderId(orderId);
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({
        orderId,
        courierId,
        restaurantId: rating.restaurantId,
        restaurantRating: 5,
        courierRating: 4,
      });
    });

    it.each([1, 5])('accepts the score %i', async score => {
      await purgeDatabase();
      const { orderId, customer } = await createOrderIn('o1', OrderStatus.Delivered);

      await customer.orders.rate(orderId, { restaurantRating: score, courierRating: score });

      expect(await getRatingsByOrderId(orderId)).toMatchObject([{ restaurantRating: score, courierRating: score }]);
    });

    it.each([0, 6, -1, 3.5, '4', null])('rejects the score %j and stores nothing', async score => {
      await purgeDatabase();
      const { orderId, customer } = await createOrderIn('o1', OrderStatus.Delivered);
      const invalid = score as number;

      await expect(
        customer.orders.rate(orderId, { restaurantRating: invalid, courierRating: 4 }),
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        customer.orders.rate(orderId, { restaurantRating: 4, courierRating: invalid }),
      ).rejects.toMatchObject({ status: 400 });
      expect(await getRatingsByOrderId(orderId)).toEqual([]);
    });

    it('rejects a missing score and names the field', async () => {
      await purgeDatabase();
      const { orderId, customer } = await createOrderIn('o1', OrderStatus.Delivered);
      const incomplete = { restaurantRating: 4 } as typeof scores;

      await expect(customer.orders.rate(orderId, incomplete)).rejects.toMatchObject({
        status: 400,
        body: { errors: [{ field: 'courierRating' }] },
      });
      expect(await getRatingsByOrderId(orderId)).toEqual([]);
    });

    it('refuses a second rating', async () => {
      await purgeDatabase();
      const { orderId, customer } = await createOrderIn('o1', OrderStatus.Delivered);
      await customer.orders.rate(orderId, scores);

      await expect(customer.orders.rate(orderId, { restaurantRating: 1, courierRating: 1 })).rejects.toMatchObject({
        status: 409,
      });
      expect(await getRatingsByOrderId(orderId)).toMatchObject([{ restaurantRating: 5, courierRating: 4 }]);
    });

    it('refuses another customer and stores nothing', async () => {
      await purgeDatabase();
      const { orderId } = await createOrderIn('o1', OrderStatus.Delivered);
      const other = new Client();
      await other.accounts.create({
        role: AccountRole.Customer,
        username: 'other',
        password: 'password123',
        name: 'Other',
      });
      await other.accounts.login({ username: 'other', password: 'password123' });

      await expect(other.orders.rate(orderId, scores)).rejects.toMatchObject({ status: 403 });
      expect(await getRatingsByOrderId(orderId)).toEqual([]);
    });

    it('refuses a caller who is not a customer and stores nothing', async () => {
      await purgeDatabase();
      const { orderId, restaurant } = await createOrderIn('o1', OrderStatus.Delivered);

      await expect(restaurant.orders.rate(orderId, scores)).rejects.toMatchObject({ status: 403 });
      expect(await getRatingsByOrderId(orderId)).toEqual([]);
    });

    it('refuses an unknown order', async () => {
      await purgeDatabase();
      const { customer } = await createOrderIn('o1', OrderStatus.Delivered);

      await expect(customer.orders.rate('0190f0a0-0000-7000-8000-000000000000', scores)).rejects.toMatchObject({
        status: 404,
      });
    });

    it.each(Object.values(OrderStatus).filter(status => status !== OrderStatus.Delivered))(
      'refuses an order that is %s and stores nothing',
      async status => {
        await purgeDatabase();
        const { orderId, customer } = await createOrderIn('o1', status);

        await expect(customer.orders.rate(orderId, scores)).rejects.toMatchObject({ status: 409 });
        expect(await getRatingsByOrderId(orderId)).toEqual([]);
      },
    );
  });
});

describe('restaurant average rating', () => {
  async function ratingOf(client: Client, orderId: string) {
    const { restaurantId } = await client.orders.get(orderId);
    const restaurants = await client.restaurants.find();
    return restaurants.find(restaurant => restaurant.id === restaurantId)!.averageRating;
  }

  it('is null while the restaurant has no rating', async () => {
    await purgeDatabase();
    const { orderId, customer } = await createOrderIn('o1', OrderStatus.Delivered);

    expect(await ratingOf(customer, orderId)).toBeNull();
  });

  it('reflects a rating on the next read', async () => {
    await purgeDatabase();
    const { orderId, customer } = await createOrderIn('o1', OrderStatus.Delivered);

    await customer.orders.rate(orderId, { restaurantRating: 4, courierRating: 1 });

    expect(await ratingOf(customer, orderId)).toBe(4);
  });

  it('averages the restaurant ratings of its orders and ignores courier ratings', async () => {
    await purgeDatabase();
    const placed = await createPlacedOrder('o1');
    const courier = await putCourierOnline('courier1');
    const first = await advanceTo('o1', placed, OrderStatus.Delivered, courier);
    const { restaurantId, lines } = await first.customer.orders.get(first.orderId);
    const second = await first.customer.orders.place({
      restaurantId,
      items: [{ menuItemId: lines[0].menuItemId, quantity: 1 }],
    });
    await advanceTo('o1', { ...placed, orderId: second.id }, OrderStatus.Delivered, courier);

    await first.customer.orders.rate(first.orderId, { restaurantRating: 5, courierRating: 1 });
    await first.customer.orders.rate(second.id, { restaurantRating: 2, courierRating: 1 });

    expect(await ratingOf(first.customer, first.orderId)).toBe(3.5);
  });

  it('does not change when a rating is refused', async () => {
    await purgeDatabase();
    const { orderId, customer } = await createOrderIn('o1', OrderStatus.Delivered);
    await customer.orders.rate(orderId, { restaurantRating: 4, courierRating: 4 });

    await expect(customer.orders.rate(orderId, { restaurantRating: 1, courierRating: 1 })).rejects.toMatchObject({
      status: 409,
    });

    expect(await ratingOf(customer, orderId)).toBe(4);
  });
});
