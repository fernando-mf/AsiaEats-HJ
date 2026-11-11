import { describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '#domain/errors.js';
import type { EventsService } from '#domain/events/index.js';
import { AccountRole } from '#domain/reg/index.js';
import {
  type MenuItem,
  MenuItemStatus,
  MenuItemUpdateRequest,
  type Restaurant,
  RestaurantStatus,
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
