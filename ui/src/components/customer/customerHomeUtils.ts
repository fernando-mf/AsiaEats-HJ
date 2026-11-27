import type { MenuItem, Restaurant } from '../dashboard/dashboard.types';

export type Dish = {
  item: MenuItem;
  restaurant: Restaurant;
};

const NEARBY_KM = 3;
const QUICK_PICKS = 5;

export function getOrderableDishes(
  restaurants: Restaurant[],
  menus: Record<string, MenuItem[]>,
): Dish[] {
  return restaurants
    .filter(restaurant => restaurant.status === 'open')
    .flatMap(restaurant =>
      (menus[restaurant.id] ?? [])
        .filter(item => item.status === 'available')
        .map(item => ({ item, restaurant })),
    );
}

export function getSpotlightRestaurant(
  restaurants: Restaurant[],
  menus: Record<string, MenuItem[]>,
  pick: Dish | undefined,
): Restaurant | undefined {
  const candidates = restaurants.filter(
    restaurant =>
      restaurant.status === 'open' &&
      (menus[restaurant.id] ?? []).some(item => item.status === 'available'),
  );

  return candidates.find(restaurant => restaurant.id !== pick?.restaurant.id) ?? candidates[0];
}

export function getQuickPicks(dishes: Dish[]): string[] {
  return [...new Set(dishes.map(dish => dish.item.name))].slice(0, QUICK_PICKS);
}

export function getMatchingDishes(dishes: Dish[], search: string): Dish[] {
  if (!search) return dishes;

  return dishes.filter(
    dish =>
      dish.item.name.toLowerCase().includes(search) ||
      dish.restaurant.name.toLowerCase().includes(search),
  );
}

export function getVisibleRestaurants(
  restaurants: Restaurant[],
  menus: Record<string, MenuItem[]>,
  search: string,
  openOnly: boolean,
  nearbyOnly: boolean,
): Restaurant[] {
  return restaurants.filter(
    restaurant =>
      (!search ||
        restaurant.name.toLowerCase().includes(search) ||
        (menus[restaurant.id] ?? []).some(item => item.name.toLowerCase().includes(search))) &&
      (!openOnly || restaurant.status === 'open') &&
      (!nearbyOnly || (restaurant.distanceKm ?? Infinity) <= NEARBY_KM),
  );
}
