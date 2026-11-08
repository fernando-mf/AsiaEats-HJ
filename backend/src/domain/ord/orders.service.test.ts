import { describe, expect, it, vi } from 'vitest';
import { InvalidParamsError } from '#domain/errors.js';
import type { EventsService } from '#domain/events/index.js';
import { type Address, AccountRole, type Customer, type CustomersService } from '#domain/reg/index.js';
import { type Order, OrderPlacementRequest } from './orders.models.js';
import { type OrderRepository, OrdersService } from './orders.service.js';
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
    getMenu: vi.fn().mockResolvedValue([
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
    const address = { street: '1455 De Maisonneuve Blvd W', city: 'Montréal', postalCode: 'H3G 1M8', latitude: 45.4972, longitude: -73.579 };
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
