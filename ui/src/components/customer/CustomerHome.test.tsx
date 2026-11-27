
// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomerHome } from './CustomerHome';
import type { MenuItem, Restaurant } from '../dashboard/dashboard.types';

const restaurants: Restaurant[] = [
  {
    id: 'r1',
    ownerId: 'owner1',
    name: 'Lucky Dumpling',
    status: 'open',
    position: { latitude: 45.5, longitude: -73.6 },
    distanceKm: 1,
  },
  {
    id: 'r2',
    ownerId: 'owner2',
    name: 'Noodle House',
    status: 'open',
    position: { latitude: 45.51, longitude: -73.61 },
    distanceKm: 5,
  },
  {
    id: 'r3',
    ownerId: 'owner3',
    name: 'Closed Cafe',
    status: 'closed',
    position: { latitude: 45.52, longitude: -73.62 },
    distanceKm: 2,
  },
];

const menus: Record<string, MenuItem[]> = {
  r1: [
    {
      id: 'd1',
      restaurantId: 'r1',
      name: 'Pork Dumplings',
      price: 12,
      status: 'available',
    },
  ],
  r2: [
    {
      id: 'd2',
      restaurantId: 'r2',
      name: 'Beef Noodles',
      price: 15,
      status: 'available',
    },
  ],
  r3: [],
};

function renderCustomerHome() {
  return render(
    <CustomerHome
      restaurants={restaurants}
      menus={menus}
      hasAddress={true}
      busy={null}
      onRefresh={vi.fn()}
      onOpenRestaurant={vi.fn()}
      onAddDish={vi.fn()}
    />,
  );
}

function getRestaurantList(container: HTMLElement) {
  const grid = container.querySelector('.restaurant-tile-grid');

  if (!grid) {
    throw new Error('Restaurant grid was not found');
  }

  return within(grid as HTMLElement);
}

function getFilterButton(container: HTMLElement, label: string) {
  const chips = container.querySelector('.home-chips');

  if (!chips) {
    throw new Error('Filter buttons were not found');
  }

  const button = Array.from(chips.querySelectorAll('button')).find(
    button => button.textContent?.trim() === label,
  );

  if (!button) {
    throw new Error(`Filter button "${label}" was not found`);
  }

  return button;
}

describe('CustomerHome', () => {
  it('displays the restaurants', () => {
    renderCustomerHome();

    expect(screen.getAllByText('Lucky Dumpling').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Noodle House').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Closed Cafe').length).toBeGreaterThan(0);
  });

  it('filters restaurants using the search input', () => {
    const { container } = renderCustomerHome();

    const search = container.querySelector(
      '.home-search input',
    ) as HTMLInputElement | null;

    expect(search).not.toBeNull();

    fireEvent.change(search!, { target: { value: 'dumpling' } });

    const restaurantList = getRestaurantList(container);

    expect(restaurantList.getByText('Lucky Dumpling')).toBeTruthy();
    expect(restaurantList.queryByText('Noodle House')).toBeNull();
  });

  it('filters restaurants to show only open restaurants', () => {
    const { container } = renderCustomerHome();

    fireEvent.click(getFilterButton(container, 'Open now'));

    const restaurantList = getRestaurantList(container);

    expect(restaurantList.getByText('Lucky Dumpling')).toBeTruthy();
    expect(restaurantList.queryByText('Closed Cafe')).toBeNull();
  });

  it('filters restaurants to show only nearby restaurants', () => {
    const { container } = renderCustomerHome();

    fireEvent.click(getFilterButton(container, 'Within 3 km'));

    const restaurantList = getRestaurantList(container);

    expect(restaurantList.getByText('Lucky Dumpling')).toBeTruthy();
    expect(restaurantList.queryByText('Noodle House')).toBeNull();
  });
});
