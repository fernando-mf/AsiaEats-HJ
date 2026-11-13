import { describe, expect, it, vi } from 'vitest';
import { ConflictError, ForbiddenError } from '#domain/errors.js';
import type { EventsService } from '#domain/events/index.js';
import { AccountRole } from '#domain/reg/index.js';
import {
  type MenuItem,
  MenuItemStatus,
  MenuItemUpdateRequest,
  type Restaurant,
  RestaurantStatus,
  RestaurantStatusUpdateRequest,
} from './restaurants.models.js';
import { type RestaurantRepository, RestaurantsService } from './restaurants.service.js';

const restaurant: Restaurant = {
  id: 'restaurant-1',
  ownerId: 'owner-1',
  name: 'Golden Dragon',
  status: RestaurantStatus.Open,
  position: { latitude: 45.5, longitude: -73.56 },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const menu: MenuItem[] = [
  {
    id: 'item-1',
    restaurantId: restaurant.id,
    name: 'Pork Dumplings',
    price: 9.5,
    status: MenuItemStatus.Available,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

function newService() {
  const repository = {
    getById: vi.fn().mockResolvedValue(restaurant),
    listMenuItems: vi.fn().mockResolvedValue(menu),
  } as unknown as RestaurantRepository;

  return new RestaurantsService(repository, {} as EventsService);
}

describe('RestaurantsService.browseMenu', () => {
  it('lets the owner read their own menu', async () => {
    const actor = { id: 'owner-1', role: AccountRole.Restaurant };

    await expect(newService().browseMenu(actor, restaurant.id)).resolves.toEqual(menu);
  });

  it("refuses restaurant staff reading another restaurant's menu", async () => {
    const actor = { id: 'owner-2', role: AccountRole.Restaurant };

    await expect(newService().browseMenu(actor, restaurant.id)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it.each([AccountRole.Customer, AccountRole.Operator])('lets a %s read any menu', async role => {
    const actor = { id: 'someone', role };

    await expect(newService().browseMenu(actor, restaurant.id)).resolves.toEqual(menu);
  });
});

describe('RestaurantsService.updateMenuItem events (R-ORD-05)', () => {
  const owner = { id: 'owner-1', role: AccountRole.Restaurant };

  function newEditor() {
    const dish = { ...menu[0] };
    const updateMenuItem = vi.fn(async (item: MenuItem) => item);
    const publish = vi.fn();
    const repository = {
      getById: vi.fn().mockResolvedValue(restaurant),
      getMenuItem: vi.fn().mockResolvedValue(dish),
      updateMenuItem,
    } as unknown as RestaurantRepository;
    const service = new RestaurantsService(repository, { publish } as unknown as EventsService);
    const eventTypes = () => publish.mock.calls.map(([event]) => event.eventType);
    return { service, updateMenuItem, publish, eventTypes };
  }

  const update = (changes: Partial<MenuItem>) =>
    MenuItemUpdateRequest.initialize({
      name: 'Pork Dumplings',
      price: 9.5,
      status: MenuItemStatus.Available,
      ...changes,
    });

  it('records marking a dish sold out as a status transition', async () => {
    const { service, publish, eventTypes } = newEditor();

    await service.updateMenuItem(owner, restaurant.id, 'item-1', update({ status: MenuItemStatus.SoldOut }));

    expect(eventTypes()).toEqual(['menu_item.status_changed']);
    expect(publish.mock.calls[0][0].payload).toEqual({
      previousStatus: MenuItemStatus.Available,
      newStatus: MenuItemStatus.SoldOut,
    });
  });

  it('records a price change as an update, without a status transition', async () => {
    const { service, eventTypes } = newEditor();

    await service.updateMenuItem(owner, restaurant.id, 'item-1', update({ price: 10.5 }));

    expect(eventTypes()).toEqual(['menu_item.updated']);
  });

  it('records both when the details and the status change together', async () => {
    const { service, eventTypes } = newEditor();

    await service.updateMenuItem(
      owner,
      restaurant.id,
      'item-1',
      update({ name: 'Pork Dumplings (8)', status: MenuItemStatus.SoldOut }),
    );

    expect(eventTypes()).toEqual(['menu_item.updated', 'menu_item.status_changed']);
  });

  it('saves nothing and records nothing when nothing changed', async () => {
    const { service, updateMenuItem, publish } = newEditor();

    await service.updateMenuItem(owner, restaurant.id, 'item-1', update({}));

    expect(updateMenuItem).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });
});

describe('RestaurantsService.updateStatus', () => {
  const owner = { id: restaurant.ownerId, role: AccountRole.Restaurant };

  function newStatusChanger(ordersInProgress: number) {
    const repository = {
      getById: vi.fn(async () => ({ ...restaurant })),
      countOrdersInProgress: vi.fn().mockResolvedValue(ordersInProgress),
      updateStatus: vi.fn(async (updated: Restaurant) => updated),
    } as unknown as RestaurantRepository;
    const events = { publish: vi.fn() } as unknown as EventsService;

    return { service: new RestaurantsService(repository, events), repository, events };
  }

  const to = (status: RestaurantStatus) => RestaurantStatusUpdateRequest.initialize({ status });

  it('refuses to close a restaurant that still has orders to accept or prepare', async () => {
    const { service, repository, events } = newStatusChanger(2);

    await expect(service.updateStatus(owner, restaurant.id, to(RestaurantStatus.Closed))).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(repository.updateStatus).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('closes a restaurant once it has no orders left to accept or prepare', async () => {
    const { service } = newStatusChanger(0);

    const updated = await service.updateStatus(owner, restaurant.id, to(RestaurantStatus.Closed));

    expect(updated.status).toBe(RestaurantStatus.Closed);
  });

  it('pauses a restaurant even while it has orders in progress, which it must still finish', async () => {
    const { service, repository } = newStatusChanger(2);

    const updated = await service.updateStatus(owner, restaurant.id, to(RestaurantStatus.Paused));

    expect(updated.status).toBe(RestaurantStatus.Paused);
    expect(repository.countOrdersInProgress).not.toHaveBeenCalled();
  });
});
