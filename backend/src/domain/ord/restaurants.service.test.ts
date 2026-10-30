import { describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '#domain/errors.js';
import type { EventsService } from '#domain/events/index.js';
import { AccountRole } from '#domain/reg/index.js';
import { type MenuItem, MenuItemStatus, type Restaurant, RestaurantStatus } from './restaurants.models.js';
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
