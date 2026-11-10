import { describe, expect, it, vi } from 'vitest';
import { ConflictError, InvalidParamsError } from '#domain/errors.js';
import type { EventsService } from '#domain/events/index.js';
import { type Address, AccountRole, type Customer, type CustomersService } from '#domain/reg/index.js';
import { type Order, OrderPlacementRequest, OrderRejectionRequest, OrderStatus } from './orders.models.js';
import { type OrderRepository, OrdersService } from './orders.service.js';
import { InvalidOrderTransitionError } from './orders.statemachine.js';
import { MenuItemStatus, RestaurantStatus } from './restaurants.models.js';
import type { RestaurantsService } from './restaurants.service.js';

const actor = { id: '0190f0a0-0000-7000-8000-000000000001', role: AccountRole.Customer };
const restaurantId = '0190f0a0-0000-7000-8000-000000000002';
const menuItemId = '0190f0a0-0000-7000-8000-000000000003';

function newService(address: Address | null) {
  const customer = { address } as Customer;
  const repository = {
    create: vi.fn(async (order: Order) => ({ ...order, id: 'order-1' })),
  } as unknown as OrderRepository;
  const restaurants = {
    getById: vi.fn().mockResolvedValue({ id: restaurantId, status: RestaurantStatus.Open }),
    getMenu: vi
      .fn()
      .mockResolvedValue([
        { id: menuItemId, restaurantId, name: 'Pork Dumplings', price: 9.5, status: MenuItemStatus.Available },
      ]),
  } as unknown as RestaurantsService;
  const customers = { getById: vi.fn().mockResolvedValue(customer) } as unknown as CustomersService;
  const events = { publish: vi.fn() } as unknown as EventsService;

  return { customer, service: new OrdersService(repository, restaurants, customers, events) };
}

const request = () => OrderPlacementRequest.initialize({ restaurantId, items: [{ menuItemId, quantity: 2 }] });

describe('OrdersService.place', () => {
  it("keeps a copy of the customer's address that later profile changes don't move", async () => {
    const address = {
      street: '1455 De Maisonneuve Blvd W',
      city: 'Montréal',
      postalCode: 'H3G 1M8',
      latitude: 45.4972,
      longitude: -73.579,
    };
    const { customer, service } = newService({ ...address });

    const order = await service.place(actor, request());
    customer.address!.street = '1 Other Street';
    customer.address!.latitude = 45.458;

    expect(order.deliveryAddress).toEqual(address);
  });

  it('refuses an order from a customer without an address', async () => {
    const { service } = newService(null);

    await expect(service.place(actor, request())).rejects.toBeInstanceOf(InvalidParamsError);
  });
});

// The restaurant side: a kitchen whose repository holds the given orders and reports `head`
// as the next accepted order in the preparation queue.
const owner = { id: '0190f0a0-0000-7000-8000-000000000009', role: AccountRole.Restaurant };

function kitchenOrder(id: string, status: OrderStatus): Order {
  return {
    id,
    customerId: actor.id,
    restaurantId,
    status,
    deliveryAddress: null,
    lines: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function newKitchen(orders: Order[], head?: Order) {
  const byId = new Map(orders.map(order => [order.id, order]));
  const updateStatus = vi.fn(async (order: Order) => order);
  const publish = vi.fn();
  const repository = {
    getById: vi.fn(async (id: string) => byId.get(id)),
    getNextAccepted: vi.fn(async () => head),
    updateStatus,
  } as unknown as OrderRepository;

  const service = new OrdersService(
    repository,
    {} as RestaurantsService,
    {} as CustomersService,
    { publish } as unknown as EventsService,
  );
  return { service, updateStatus, publish };
}

describe('OrdersService preparation queue (R-ORD-03)', () => {
  it('starts preparing the order at the head of the queue', async () => {
    const first = kitchenOrder('order-1', OrderStatus.Accepted);
    const { service, publish } = newKitchen([first], first);

    const order = await service.prepare(owner, first.id);

    expect(order.status).toBe(OrderStatus.Preparing);
    expect(publish.mock.calls[0][0].payload).toMatchObject({
      previousStatus: OrderStatus.Accepted,
      newStatus: OrderStatus.Preparing,
    });
  });

  it('refuses to prepare an order out of turn', async () => {
    const first = kitchenOrder('order-1', OrderStatus.Accepted);
    const second = kitchenOrder('order-2', OrderStatus.Accepted);
    const { service, updateStatus } = newKitchen([first, second], first);

    await expect(service.prepare(owner, second.id)).rejects.toBeInstanceOf(ConflictError);
    expect(updateStatus).not.toHaveBeenCalled();
  });
});

describe('OrdersService lifecycle (R-ORD-04)', () => {
  it('accepts a placed order', async () => {
    const placed = kitchenOrder('order-1', OrderStatus.Placed);
    const { service } = newKitchen([placed]);

    await expect(service.accept(owner, placed.id)).resolves.toMatchObject({ status: OrderStatus.Accepted });
  });

  it('records the reason when an order is rejected', async () => {
    const placed = kitchenOrder('order-1', OrderStatus.Placed);
    const { service, publish } = newKitchen([placed]);

    const order = await service.reject(owner, placed.id, OrderRejectionRequest.initialize({ reason: 'Out of tofu' }));

    expect(order.status).toBe(OrderStatus.Rejected);
    expect(order.rejectionReason).toBe('Out of tofu');
    expect(publish.mock.calls[0][0].payload).toMatchObject({ reason: 'Out of tofu' });
  });

  it('refuses to mark an order ready before it is prepared', async () => {
    const accepted = kitchenOrder('order-1', OrderStatus.Accepted);
    const { service, updateStatus } = newKitchen([accepted]);

    await expect(service.ready(owner, accepted.id)).rejects.toBeInstanceOf(InvalidOrderTransitionError);
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it('lets a customer cancel only while the order is still placed', async () => {
    const accepted = kitchenOrder('order-1', OrderStatus.Accepted);
    const { service } = newKitchen([accepted]);

    await expect(service.cancel(actor, accepted.id)).rejects.toBeInstanceOf(InvalidOrderTransitionError);
  });
});
