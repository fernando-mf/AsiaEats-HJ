// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readStoredCart, writeStoredCart } from '../../shared/cart/cartStorage';
import { readDashboardSession, writeDashboardSession } from '../../shared/dashboard/dashboardSession';
import { requestJson } from '../../shared/api/client';
import { CustomerDashboard } from './CustomerDashboard';
import type { Account, Address, MenuItem, Order, Restaurant, RunAction } from './dashboard.types';

vi.mock('../../shared/api/client', async importOriginal => {
  const actual = await importOriginal<typeof import('../../shared/api/client')>();
  return { ...actual, requestJson: vi.fn() };
});

const requestJsonMock = vi.mocked(requestJson);

const account: Account = { id: 'c1', username: 'casey', name: 'Casey Customer', role: 'customer' };

const restaurants: Restaurant[] = [
  {
    id: 'r1',
    ownerId: 'owner1',
    name: 'Lucky Dumpling',
    status: 'open',
    position: { latitude: 45.5, longitude: -73.6 },
  },
  {
    id: 'r2',
    ownerId: 'owner2',
    name: 'Noodle House',
    status: 'open',
    position: { latitude: 45.51, longitude: -73.61 },
  },
];

const menus: Record<string, MenuItem[]> = {
  r1: [
    { id: 'd1', restaurantId: 'r1', name: 'Pork Dumplings', price: 12, status: 'available' },
    { id: 'd2', restaurantId: 'r1', name: 'Spring Rolls', price: 8, status: 'available' },
  ],
  r2: [{ id: 'd3', restaurantId: 'r2', name: 'Beef Noodles', price: 15, status: 'available' }],
};

const savedAddress: Address = {
  street: '123 Main St',
  city: 'Montréal',
  postalCode: 'H3G 1M8',
  latitude: 45.5,
  longitude: -73.6,
};

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-12345',
    customerId: 'c1',
    customerName: 'Casey Customer',
    restaurantId: 'r1',
    status: 'placed',
    lines: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

type RequestOptions = { method?: string; body?: unknown };
type Handler = (options?: RequestOptions) => unknown;

// Routes are keyed "METHOD path". The restaurant list answers to any query string.
let routes: Record<string, Handler>;
let profileAddress: Address | null;

function defaultRoutes(): Record<string, Handler> {
  return {
    'GET /customers/me': () => ({ address: profileAddress }),
    'GET /orders?customerId=c1': () => [],
    'GET /restaurants/r1/menu': () => menus.r1,
    'GET /restaurants/r2/menu': () => menus.r2,
    'PUT /customers/me': options => ({ address: (options?.body as { address: Address } | undefined)?.address ?? null }),
  };
}

function installRequestMock() {
  requestJsonMock.mockImplementation(((path: string, options?: RequestOptions) => {
    const key = `${options?.method ?? 'GET'} ${path}`;
    const isRestaurantList = key === 'GET /restaurants' || key.startsWith('GET /restaurants?');
    const handler = routes[key] ?? (isRestaurantList ? () => restaurants : undefined);
    if (!handler) return Promise.reject(new Error(`Unexpected request: ${key}`));
    try {
      return Promise.resolve(handler(options));
    } catch (error) {
      return Promise.reject(error);
    }
  }) as typeof requestJson);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(settle => {
    resolve = settle;
  });
  return { promise, resolve };
}

const showToast = vi.fn();
// Mirrors the real run(): failures resolve to undefined instead of throwing.
const run: RunAction = async action => {
  try {
    return await action();
  } catch {
    return undefined;
  }
};

function renderDashboard() {
  return render(
    <CustomerDashboard
      account={account}
      busy={null}
      run={run}
      showToast={showToast}
      onAccountChange={vi.fn()}
      onLogout={vi.fn()}
    />,
  );
}

const pageSelectors = {
  restaurants: '.home',
  menu: '.storefront',
  cart: '.checkout',
  orders: '.orders-page',
  profile: '.profile-page',
} as const;

function expectPage(container: HTMLElement, page: keyof typeof pageSelectors) {
  for (const [name, selector] of Object.entries(pageSelectors)) {
    expect(container.querySelector(selector) !== null, `page "${name}"`).toBe(name === page);
  }
}

function page(container: HTMLElement, name: keyof typeof pageSelectors) {
  const element = container.querySelector<HTMLElement>(pageSelectors[name]);
  if (!element) throw new Error(`Page "${name}" is not showing`);
  return within(element);
}

function cartButton() {
  return screen.getByRole('button', { name: /^Cart, / });
}

function cartLabel() {
  return cartButton().getAttribute('aria-label');
}

function ordersLoadCount() {
  return requestJsonMock.mock.calls.filter(([path]) => path === '/orders?customerId=c1').length;
}

async function restaurantTile(container: HTMLElement, name: string) {
  await screen.findAllByText(name);
  return waitFor(() => {
    const tile = Array.from(container.querySelectorAll<HTMLButtonElement>('.restaurant-tile')).find(
      button => button.querySelector('.restaurant-tile-name')?.textContent === name,
    );
    if (!tile) throw new Error(`Restaurant tile "${name}" was not found`);
    return tile;
  });
}

function seedSession(customerPage: 'restaurants' | 'menu' | 'cart' | 'orders' | 'profile', restaurantId = 'r1') {
  writeDashboardSession({ customerPage, restaurantPage: 'overview', selectedRestaurantId: restaurantId });
}

// Waits until the selected restaurant's menu and the order list have loaded.
async function waitForLoad() {
  await waitFor(() => {
    expect(requestJsonMock).toHaveBeenCalledWith('/orders?customerId=c1');
    expect(requestJsonMock).toHaveBeenCalledWith('/restaurants/r1/menu');
  });
}

beforeAll(() => {
  // jsdom has no modal dialog or scrolling support.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
  window.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  window.sessionStorage.clear();
  vi.clearAllMocks();
  profileAddress = null;
  routes = defaultRoutes();
  installRequestMock();
});

afterEach(() => {
  cleanup();
});

describe('CustomerDashboard initial loading', () => {
  it('loads the profile, restaurants, menus and orders, then shows the home page', async () => {
    const { container } = renderDashboard();

    await screen.findAllByText('Lucky Dumpling');
    await waitForLoad();
    await waitFor(() => expect(requestJsonMock).toHaveBeenCalledWith('/restaurants/r2/menu'));

    expect(requestJsonMock).toHaveBeenCalledWith('/customers/me');
    expect(requestJsonMock).toHaveBeenCalledWith('/restaurants');
    expect(requestJsonMock).toHaveBeenCalledWith('/orders?customerId=c1');
    expectPage(container, 'restaurants');
    expect(screen.getAllByText('Noodle House').length).toBeGreaterThan(0);
    // Every restaurant's dishes feed the home page.
    await screen.findAllByRole('button', { name: 'Add Beef Noodles to cart' });
  });

  it('asks for an address when the customer has none, without a distance query', async () => {
    renderDashboard();

    await screen.findAllByText('Lucky Dumpling');

    expect(requestJsonMock).toHaveBeenCalledWith('/restaurants');
    expect(requestJsonMock).not.toHaveBeenCalledWith(expect.stringContaining('lat='));
    expect(screen.getByRole('button', { name: 'Add a delivery address' })).toBeTruthy();
    expect(screen.getByText('Add your delivery address')).toBeTruthy();
  });

  it('loads restaurants with the address coordinates when an address exists', async () => {
    profileAddress = savedAddress;
    renderDashboard();

    await screen.findAllByText('Lucky Dumpling');

    expect(requestJsonMock).toHaveBeenCalledWith('/restaurants?lat=45.5&lon=-73.6');
    expect(requestJsonMock).not.toHaveBeenCalledWith('/restaurants');
    expect(screen.getByRole('button', { name: 'Deliver to 123 Main St. Change address' })).toBeTruthy();
    expect(screen.queryByText('Add your delivery address')).toBeNull();
  });

  it('treats a failed profile load as no address so restaurants still load', async () => {
    routes['GET /customers/me'] = () => {
      throw new Error('profile down');
    };
    renderDashboard();

    await screen.findAllByText('Lucky Dumpling');

    expect(requestJsonMock).toHaveBeenCalledWith('/restaurants');
    expect(screen.getByRole('button', { name: 'Add a delivery address' })).toBeTruthy();
  });

  it('selects the first restaurant and loads its menu once restaurants arrive', async () => {
    renderDashboard();

    await waitForLoad();

    expect(readDashboardSession()?.selectedRestaurantId).toBe('r1');
  });

  it('keeps the other restaurants on the home page when one menu fails to load', async () => {
    routes['GET /restaurants/r2/menu'] = () => {
      throw new Error('menu down');
    };
    renderDashboard();

    await screen.findAllByRole('button', { name: 'Add Pork Dumplings to cart' });

    expect(screen.queryByRole('button', { name: 'Add Beef Noodles to cart' })).toBeNull();
    expect(screen.getAllByText('Noodle House').length).toBeGreaterThan(0);
  });
});

describe('CustomerDashboard cart', () => {
  it('adds a dish from the menu page, shows a toast and updates the header', async () => {
    seedSession('menu');
    const { container } = renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Add Pork Dumplings to cart' }));

    expect(showToast).toHaveBeenCalledWith('Pork Dumplings added to cart.', 'success', {
      label: 'View cart',
      onClick: expect.any(Function),
    });
    expect(cartLabel()).toBe('Cart, 1 item');
    expect(cartButton().textContent).toContain('$12.00');
    expect(page(container, 'menu').getByRole('group', { name: 'Pork Dumplings quantity' })).toBeTruthy();
  });

  it('opens the cart from the toast shortcut', async () => {
    seedSession('menu');
    const { container } = renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Add Pork Dumplings to cart' }));
    const action = showToast.mock.calls[0][2] as { onClick: () => void };
    act(() => action.onClick());

    expectPage(container, 'cart');
  });

  it('changes quantities and removes a dish when it goes below one', async () => {
    seedSession('menu');
    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Add Pork Dumplings to cart' }));
    showToast.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Add one Pork Dumplings' }));
    expect(cartLabel()).toBe('Cart, 2 items');
    expect(cartButton().textContent).toContain('$24.00');

    fireEvent.click(screen.getByRole('button', { name: 'Remove one Pork Dumplings' }));
    expect(cartLabel()).toBe('Cart, 1 item');
    expect(showToast).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Remove one Pork Dumplings' }));
    expect(cartLabel()).toBe('Cart, 0 items');
    expect(cartButton().textContent).toContain('$0.00');
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith('Pork Dumplings removed from cart.');
    expect(screen.getByRole('button', { name: 'Add Pork Dumplings to cart' })).toBeTruthy();
  });

  it('removes a dish from the cart page and shows the empty cart', async () => {
    seedSession('cart');
    writeStoredCart({ restaurantId: 'r1', items: { d1: 1 } });
    const { container } = renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Remove one Pork Dumplings' }));

    expect(showToast).toHaveBeenCalledWith('Pork Dumplings removed from cart.');
    expect(page(container, 'cart').getByText('Your cart is empty')).toBeTruthy();
    expect(readStoredCart()).toBeNull();
  });

  it('shows the cart count and total of every line in the header', async () => {
    seedSession('menu');
    writeStoredCart({ restaurantId: 'r1', items: { d1: 2, d2: 1 } });
    renderDashboard();

    await waitForLoad();

    expect(cartLabel()).toBe('Cart, 3 items');
    expect(cartButton().textContent).toContain('$32.00');
    expect(cartButton().querySelector('.cart-count')?.textContent).toBe('3');
  });

  it('drops cart dishes missing from the loaded menu', async () => {
    seedSession('menu');
    writeStoredCart({ restaurantId: 'r1', items: { d1: 1, gone: 2 } });
    renderDashboard();

    // Before the menu loads the header still counts every stored item.
    expect(cartLabel()).toBe('Cart, 3 items');

    await waitFor(() => expect(cartLabel()).toBe('Cart, 1 item'));
    expect(cartButton().textContent).toContain('$12.00');
    expect(readStoredCart()).toEqual({ restaurantId: 'r1', items: { d1: 1 } });
  });

  it('empties the stored cart when no cart dish is on the menu', async () => {
    seedSession('menu');
    writeStoredCart({ restaurantId: 'r1', items: { gone: 2 } });
    renderDashboard();

    await waitFor(() => expect(cartLabel()).toBe('Cart, 0 items'));
    expect(readStoredCart()).toBeNull();
  });
});

describe('CustomerDashboard restaurant switching', () => {
  it('opens the confirm dialog when opening another restaurant with a non-empty cart', async () => {
    seedSession('restaurants');
    writeStoredCart({ restaurantId: 'r1', items: { d1: 1 } });
    const { container } = renderDashboard();

    fireEvent.click(await restaurantTile(container, 'Noodle House'));

    const dialog = screen.getByRole('dialog', { name: 'Switch to Noodle House?' });
    expect(within(dialog).getByText(/Switching restaurants will clear your cart/)).toBeTruthy();
    expectPage(container, 'restaurants');
    expect(cartLabel()).toBe('Cart, 1 item');
  });

  it('keeps the cart and page when the switch is cancelled', async () => {
    seedSession('restaurants');
    writeStoredCart({ restaurantId: 'r1', items: { d1: 1 } });
    const { container } = renderDashboard();

    fireEvent.click(await restaurantTile(container, 'Noodle House'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Keep my cart' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(cartLabel()).toBe('Cart, 1 item');
    expectPage(container, 'restaurants');
    expect(readStoredCart()).toEqual({ restaurantId: 'r1', items: { d1: 1 } });
    expect(showToast).not.toHaveBeenCalled();
  });

  it('clears the cart, opens the new restaurant and shows a toast when the switch is confirmed', async () => {
    seedSession('restaurants');
    writeStoredCart({ restaurantId: 'r1', items: { d1: 1 } });
    const { container } = renderDashboard();

    fireEvent.click(await restaurantTile(container, 'Noodle House'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Switch and clear cart' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expectPage(container, 'menu');
    expect(page(container, 'menu').getByRole('heading', { name: 'Noodle House' })).toBeTruthy();
    expect(cartLabel()).toBe('Cart, 0 items');
    expect(showToast).toHaveBeenCalledWith('Cart cleared. Now browsing Noodle House.');
    expect(readStoredCart()).toBeNull();
    expect(readDashboardSession()).toEqual({
      customerPage: 'menu',
      restaurantPage: 'overview',
      selectedRestaurantId: 'r2',
    });
    await waitFor(() => expect(requestJsonMock).toHaveBeenCalledWith('/restaurants/r2/menu'));
    await screen.findByText('Beef Noodles');
  });

  it('opens another restaurant directly when the cart is empty', async () => {
    seedSession('restaurants');
    const { container } = renderDashboard();

    fireEvent.click(await restaurantTile(container, 'Noodle House'));

    expect(screen.queryByRole('dialog')).toBeNull();
    expectPage(container, 'menu');
    expect(showToast).not.toHaveBeenCalled();
    await screen.findByText('Beef Noodles');
  });

  it('opens the same restaurant directly when the cart has items', async () => {
    seedSession('restaurants');
    writeStoredCart({ restaurantId: 'r1', items: { d1: 1 } });
    const { container } = renderDashboard();

    fireEvent.click(await restaurantTile(container, 'Lucky Dumpling'));

    expect(screen.queryByRole('dialog')).toBeNull();
    expectPage(container, 'menu');
    expect(cartLabel()).toBe('Cart, 1 item');
  });
});

describe('CustomerDashboard adding a dish from the home page', () => {
  it('adds a dish of the selected restaurant straight to a non-empty cart', async () => {
    seedSession('restaurants');
    writeStoredCart({ restaurantId: 'r1', items: { d1: 1 } });
    renderDashboard();

    fireEvent.click((await screen.findAllByRole('button', { name: 'Add Spring Rolls to cart' }))[0]);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(cartLabel()).toBe('Cart, 2 items');
    expect(showToast).toHaveBeenCalledWith('Spring Rolls added to cart.', 'success', expect.any(Object));
  });

  it('selects the dish restaurant when the cart is empty', async () => {
    seedSession('restaurants');
    const { container } = renderDashboard();

    fireEvent.click((await screen.findAllByRole('button', { name: 'Add Beef Noodles to cart' }))[0]);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(cartLabel()).toBe('Cart, 1 item');
    expect(showToast).toHaveBeenCalledWith('Beef Noodles added to cart.', 'success', expect.any(Object));
    // The customer stays on the home page.
    expectPage(container, 'restaurants');
    await waitFor(() => expect(readStoredCart()).toEqual({ restaurantId: 'r2', items: { d3: 1 } }));
    expect(readDashboardSession()?.selectedRestaurantId).toBe('r2');
  });

  it('asks before adding a dish from another restaurant to a non-empty cart', async () => {
    seedSession('restaurants');
    writeStoredCart({ restaurantId: 'r1', items: { d1: 1 } });
    renderDashboard();

    fireEvent.click((await screen.findAllByRole('button', { name: 'Add Beef Noodles to cart' }))[0]);

    expect(screen.getByRole('dialog', { name: 'Switch to Noodle House?' })).toBeTruthy();
    expect(cartLabel()).toBe('Cart, 1 item');
    expect(showToast).not.toHaveBeenCalled();
  });

  it('keeps the cart and drops the pending dish when cancelled', async () => {
    seedSession('restaurants');
    writeStoredCart({ restaurantId: 'r1', items: { d1: 1 } });
    renderDashboard();

    fireEvent.click((await screen.findAllByRole('button', { name: 'Add Beef Noodles to cart' }))[0]);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Keep my cart' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(cartLabel()).toBe('Cart, 1 item');
    expect(readStoredCart()).toEqual({ restaurantId: 'r1', items: { d1: 1 } });

    // Opening another restaurant afterwards is a plain switch: the dish is not added.
    fireEvent.click(screen.getAllByRole('button', { name: 'Add Beef Noodles to cart' })[0]);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Keep my cart' }));
    expect(showToast).not.toHaveBeenCalled();
  });

  it('replaces the cart with the pending dish when confirmed', async () => {
    seedSession('restaurants');
    writeStoredCart({ restaurantId: 'r1', items: { d1: 2, d2: 1 } });
    const { container } = renderDashboard();

    fireEvent.click((await screen.findAllByRole('button', { name: 'Add Beef Noodles to cart' }))[0]);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Switch and clear cart' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(showToast).toHaveBeenCalledWith('Cart cleared. Beef Noodles added to cart.', 'success', {
      label: 'View cart',
      onClick: expect.any(Function),
    });
    expect(cartLabel()).toBe('Cart, 1 item');
    expectPage(container, 'restaurants');
    expect(readStoredCart()).toEqual({ restaurantId: 'r2', items: { d3: 1 } });
    // The total needs the new restaurant's menu, so it stays $0.00 until that menu loads.
    expect(cartButton().textContent).toContain('$0.00');
    await waitFor(() => expect(cartButton().textContent).toContain('$15.00'));
    expect(readDashboardSession()?.selectedRestaurantId).toBe('r2');
  });
});

describe('CustomerDashboard placing an order', () => {
  function seedCheckout() {
    profileAddress = savedAddress;
    seedSession('cart');
    writeStoredCart({ restaurantId: 'r1', items: { d1: 2, d2: 1 } });
  }

  it('posts the cart, clears it, opens the orders page, shows a toast and reloads orders', async () => {
    seedCheckout();
    const placed = makeOrder({ id: 'order-new1' });
    routes['POST /orders'] = () => placed;
    const { container } = renderDashboard();

    await waitForLoad();
    const ordersBefore = ordersLoadCount();
    routes['GET /orders?customerId=c1'] = () => [placed];

    const placeButton = await screen.findByRole('button', { name: /Place order/ });
    await waitFor(() => expect((placeButton as HTMLButtonElement).disabled).toBe(false));
    expect(placeButton.textContent).toContain('$32.00');
    fireEvent.click(placeButton);

    await waitFor(() => expectPage(container, 'orders'));
    expect(requestJsonMock).toHaveBeenCalledWith('/orders', {
      method: 'POST',
      body: {
        restaurantId: 'r1',
        items: [
          { menuItemId: 'd1', quantity: 2 },
          { menuItemId: 'd2', quantity: 1 },
        ],
      },
    });
    expect(cartLabel()).toBe('Cart, 0 items');
    expect(readStoredCart()).toBeNull();
    expect(showToast).toHaveBeenCalledWith('Order placed successfully.');
    await waitFor(() => expect(ordersLoadCount()).toBe(ordersBefore + 1));
    await within(container.querySelector<HTMLElement>('.orders-page')!).findByRole('button', {
      name: 'Cancel order',
    });
  });

  it('keeps the cart and the cart page when the order is refused', async () => {
    seedCheckout();
    routes['POST /orders'] = () => {
      throw new Error('refused');
    };
    const { container } = renderDashboard();

    await waitForLoad();
    const placeButton = await screen.findByRole('button', { name: /Place order/ });
    await waitFor(() => expect((placeButton as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(placeButton);

    await waitFor(() =>
      expect(requestJsonMock).toHaveBeenCalledWith('/orders', expect.objectContaining({ method: 'POST' })),
    );
    await act(async () => {});

    expectPage(container, 'cart');
    expect(cartLabel()).toBe('Cart, 3 items');
    expect(readStoredCart()).toEqual({ restaurantId: 'r1', items: { d1: 2, d2: 1 } });
    expect(showToast).not.toHaveBeenCalled();
  });

  it('does not allow placing an order without an address', async () => {
    profileAddress = null;
    seedSession('cart');
    writeStoredCart({ restaurantId: 'r1', items: { d1: 1 } });
    renderDashboard();

    const placeButton = await screen.findByRole('button', { name: /Place order/ });
    await waitFor(() => expect(screen.getByText('Add a delivery address to place this order.')).toBeTruthy());

    expect((placeButton as HTMLButtonElement).disabled).toBe(true);
    expect(requestJsonMock).not.toHaveBeenCalledWith('/orders', expect.anything());
  });
});

describe('CustomerDashboard cancelling an order', () => {
  async function openCancelDialog() {
    seedSession('orders');
    routes['GET /orders?customerId=c1'] = () => [makeOrder()];
    const view = renderDashboard();

    const cancel = await within(await waitForOrdersPage(view.container)).findByRole('button', {
      name: 'Cancel order',
    });
    fireEvent.click(cancel);
    return view;
  }

  async function waitForOrdersPage(container: HTMLElement) {
    return waitFor(() => {
      const element = container.querySelector<HTMLElement>('.orders-page');
      if (!element) throw new Error('Orders page missing');
      return element;
    });
  }

  it('asks for confirmation naming the order and the restaurant', async () => {
    await openCancelDialog();

    const dialog = screen.getByRole('dialog', { name: 'Cancel order #order-12?' });
    expect(within(dialog).getByText(/Lucky Dumpling/)).toBeTruthy();
    expect(requestJsonMock).not.toHaveBeenCalledWith(expect.stringContaining('/cancel'), expect.anything());
  });

  it('keeps the order when the dialog is dismissed', async () => {
    await openCancelDialog();

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Keep order' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(requestJsonMock).not.toHaveBeenCalledWith(expect.stringContaining('/cancel'), expect.anything());
    expect(showToast).not.toHaveBeenCalled();
  });

  it('cancels the order, shows a toast and reloads the orders when confirmed', async () => {
    await openCancelDialog();
    const ordersBefore = ordersLoadCount();
    routes['POST /orders/order-12345/cancel'] = () => makeOrder({ status: 'cancelled' });
    routes['GET /orders?customerId=c1'] = () => [makeOrder({ status: 'cancelled' })];

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel order' }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Order cancelled.'));
    expect(requestJsonMock).toHaveBeenCalledWith('/orders/order-12345/cancel', { method: 'POST' });
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(ordersLoadCount()).toBe(ordersBefore + 1));
  });

  it('closes the dialog without a toast or reload when the cancellation fails', async () => {
    await openCancelDialog();
    const ordersBefore = ordersLoadCount();
    routes['POST /orders/order-12345/cancel'] = () => {
      throw new Error('too late');
    };

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel order' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(showToast).not.toHaveBeenCalled();
    expect(ordersLoadCount()).toBe(ordersBefore);
  });
});

describe('CustomerDashboard order rating', () => {
  const rated = { id: 'rt1', orderId: 'order-12345' };

  function ordersWith(status: string) {
    routes['GET /orders?customerId=c1'] = () => [makeOrder({ status })];
  }

  function chooseScore(group: string, score: string) {
    fireEvent.click(
      within(screen.getByRole('group', { name: group })).getByRole('button', { name: `${score} out of 5` }),
    );
  }

  function chooseScores(restaurant: string, courier: string) {
    chooseScore('Restaurant', restaurant);
    chooseScore('Courier', courier);
  }

  it('offers the rating form on delivered orders only', async () => {
    seedSession('orders');
    ordersWith('delivered');
    renderDashboard();
    expect(await screen.findByRole('form', { name: 'Rate this order' })).toBeTruthy();
  });

  it('does not offer the rating form on other past orders', async () => {
    seedSession('orders');
    ordersWith('cancelled');
    renderDashboard();
    await screen.findByText('Lucky Dumpling', { selector: '.past-order-main strong' });
    expect(screen.queryByRole('form', { name: 'Rate this order' })).toBeNull();
  });

  it('posts both ratings, confirms, and reloads the restaurants', async () => {
    seedSession('orders');
    ordersWith('delivered');
    routes['POST /orders/order-12345/rating'] = () => rated;
    renderDashboard();
    await screen.findByRole('form', { name: 'Rate this order' });
    const restaurantLoads = () =>
      requestJsonMock.mock.calls.filter(([path]) => String(path).startsWith('/restaurants?') || path === '/restaurants')
        .length;
    const before = restaurantLoads();

    chooseScores('5', '4');
    fireEvent.click(screen.getByRole('button', { name: 'Submit rating' }));

    expect(await screen.findByText('Thanks, your rating was accepted.')).toBeTruthy();
    expect(requestJsonMock).toHaveBeenCalledWith('/orders/order-12345/rating', {
      method: 'POST',
      body: { restaurantRating: 5, courierRating: 4 },
    });
    expect(showToast).toHaveBeenCalledWith('Rating submitted. Thank you!');
    expect(screen.queryByRole('form', { name: 'Rate this order' })).toBeNull();
    await waitFor(() => expect(restaurantLoads()).toBeGreaterThan(before));
  });

  it('asks for both ratings before posting', async () => {
    seedSession('orders');
    ordersWith('delivered');
    renderDashboard();
    await screen.findByRole('form', { name: 'Rate this order' });

    chooseScore('Courier', '3');
    expect(screen.getByRole('button', { name: '3 out of 5', pressed: true })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Submit rating' }));

    expect(await screen.findByText('Choose a rating from 1 to 5.')).toBeTruthy();
    expect(requestJsonMock).not.toHaveBeenCalledWith('/orders/order-12345/rating', expect.anything());
  });

  it('keeps the form when the backend refuses the rating', async () => {
    seedSession('orders');
    ordersWith('delivered');
    routes['POST /orders/order-12345/rating'] = () => {
      throw new Error('this order has already been rated');
    };
    renderDashboard();
    await screen.findByRole('form', { name: 'Rate this order' });

    chooseScores('2', '2');
    fireEvent.click(screen.getByRole('button', { name: 'Submit rating' }));

    await waitFor(() =>
      expect(requestJsonMock).toHaveBeenCalledWith(
        '/orders/order-12345/rating',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    expect(screen.getByRole('form', { name: 'Rate this order' })).toBeTruthy();
    expect(screen.queryByText('Thanks, your rating was accepted.')).toBeNull();
  });
});

describe('CustomerDashboard address flow', () => {
  function fillAddressForm() {
    fireEvent.change(screen.getByLabelText('Street address'), { target: { value: '1 Test St' } });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Montréal' } });
    fireEvent.change(screen.getByLabelText('Postal code'), { target: { value: 'H3G 1M8' } });
    fireEvent.change(screen.getByLabelText('Neighbourhood'), { target: { value: 'downtown' } });
  }

  const downtownAddress: Address = {
    street: '1 Test St',
    city: 'Montréal',
    postalCode: 'H3G 1M8',
    latitude: 45.5017,
    longitude: -73.5673,
  };

  it('returns to the cart after saving an address opened from the cart', async () => {
    seedSession('cart');
    writeStoredCart({ restaurantId: 'r1', items: { d1: 1 } });
    const { container } = renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Add address' }));
    expectPage(container, 'profile');

    fillAddressForm();
    fireEvent.click(screen.getByRole('button', { name: 'Save address' }));

    await waitFor(() => expectPage(container, 'cart'));
    expect(requestJsonMock).toHaveBeenCalledWith('/customers/me', {
      method: 'PUT',
      body: { address: downtownAddress },
    });
    expect(showToast).toHaveBeenCalledWith('Delivery address saved. You can place your order now.');
    expect(screen.getByRole('button', { name: 'Deliver to 1 Test St. Change address' })).toBeTruthy();
    // Distances come from the address, so restaurants reload with it.
    await waitFor(() => expect(requestJsonMock).toHaveBeenCalledWith('/restaurants?lat=45.5017&lon=-73.5673'));
  });

  it('returns to the menu after saving an address opened from the menu', async () => {
    seedSession('menu');
    const { container } = renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Add a delivery address to order' }));
    expectPage(container, 'profile');

    fillAddressForm();
    fireEvent.click(screen.getByRole('button', { name: 'Save address' }));

    await waitFor(() => expectPage(container, 'menu'));
    expect(showToast).toHaveBeenCalledWith('Delivery address saved. You can place your order now.');
  });

  it('stays on the profile page after saving an address opened from the header', async () => {
    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Add a delivery address' }));
    fillAddressForm();
    fireEvent.click(screen.getByRole('button', { name: 'Save address' }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Delivery address saved.'));
    expect(readDashboardSession()?.customerPage).toBe('profile');
  });

  it('forgets the return page when the customer navigates away from the form', async () => {
    seedSession('cart');
    writeStoredCart({ restaurantId: 'r1', items: { d1: 1 } });
    const { container } = renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Add address' }));
    fireEvent.click(screen.getByRole('button', { name: 'Orders' }));
    expectPage(container, 'orders');

    fireEvent.click(screen.getByRole('button', { name: 'Add a delivery address' }));
    fillAddressForm();
    fireEvent.click(screen.getByRole('button', { name: 'Save address' }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Delivery address saved.'));
    expectPage(container, 'profile');
  });

  it('stays on the form without a toast when saving fails', async () => {
    routes['PUT /customers/me'] = () => {
      throw new Error('rejected');
    };
    seedSession('cart');
    writeStoredCart({ restaurantId: 'r1', items: { d1: 1 } });
    const { container } = renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Add address' }));
    fillAddressForm();
    fireEvent.click(screen.getByRole('button', { name: 'Save address' }));

    await waitFor(() =>
      expect(requestJsonMock).toHaveBeenCalledWith('/customers/me', expect.objectContaining({ method: 'PUT' })),
    );
    await act(async () => {});

    expectPage(container, 'profile');
    expect(showToast).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Add a delivery address' })).toBeTruthy();
  });
});

describe('CustomerDashboard stale menu responses', () => {
  it('ignores a menu response that arrives after the customer switched restaurant', async () => {
    const slowMenu = deferred<MenuItem[]>();
    routes['GET /restaurants/r1/menu'] = () => slowMenu.promise;
    const { container } = renderDashboard();

    // r1 is selected first (the default), but its menu is still loading.
    fireEvent.click(await restaurantTile(container, 'Noodle House'));
    expectPage(container, 'menu');
    await screen.findByText('Beef Noodles');

    await act(async () => {
      slowMenu.resolve(menus.r1);
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(page(container, 'menu').getByRole('heading', { name: 'Noodle House' })).toBeTruthy();
    expect(screen.getByText('Beef Noodles')).toBeTruthy();
    expect(screen.queryByText('Pork Dumplings')).toBeNull();
  });

  it('does not prune the cart with a stale menu response', async () => {
    seedSession('restaurants', 'r2');
    writeStoredCart({ restaurantId: 'r2', items: { d3: 1 } });
    const slowMenu = deferred<MenuItem[]>();
    let r2Calls = 0;
    routes['GET /restaurants/r2/menu'] = () => {
      r2Calls += 1;
      // The first r2 request is the one for the selected restaurant, answered late.
      return r2Calls === 1 ? slowMenu.promise : menus.r2;
    };
    renderDashboard();

    await waitFor(() => expect(requestJsonMock).toHaveBeenCalledWith('/restaurants/r2/menu'));
    // The late answer is a full response for the same restaurant, so the cart survives it.
    await act(async () => {
      slowMenu.resolve(menus.r2);
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(cartLabel()).toBe('Cart, 1 item');
    expect(readStoredCart()).toEqual({ restaurantId: 'r2', items: { d3: 1 } });
  });
});

describe('CustomerDashboard session persistence', () => {
  it('writes the default dashboard session and an empty cart on first load', async () => {
    renderDashboard();

    await waitForLoad();

    expect(readDashboardSession()).toEqual({
      customerPage: 'restaurants',
      restaurantPage: 'overview',
      selectedRestaurantId: 'r1',
    });
    expect(readStoredCart()).toBeNull();
  });

  it('stores the cart whenever it changes', async () => {
    seedSession('menu');
    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Add Pork Dumplings to cart' }));
    expect(readStoredCart()).toEqual({ restaurantId: 'r1', items: { d1: 1 } });

    fireEvent.click(screen.getByRole('button', { name: 'Add one Pork Dumplings' }));
    expect(readStoredCart()).toEqual({ restaurantId: 'r1', items: { d1: 2 } });

    fireEvent.click(screen.getByRole('button', { name: 'Remove one Pork Dumplings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove one Pork Dumplings' }));
    expect(readStoredCart()).toBeNull();
  });

  it('stores the current page as the customer navigates', async () => {
    renderDashboard();
    await waitForLoad();

    fireEvent.click(screen.getByRole('button', { name: 'Orders' }));
    expect(readDashboardSession()?.customerPage).toBe('orders');

    fireEvent.click(screen.getByRole('button', { name: 'Discover' }));
    expect(readDashboardSession()?.customerPage).toBe('restaurants');

    fireEvent.click(cartButton());
    expect(readDashboardSession()?.customerPage).toBe('cart');
  });

  it('restores the stored page, restaurant and cart', async () => {
    seedSession('menu', 'r2');
    writeStoredCart({ restaurantId: 'r2', items: { d3: 2 } });
    const { container } = renderDashboard();

    expectPage(container, 'menu');
    expect(cartLabel()).toBe('Cart, 2 items');
    await screen.findByRole('button', { name: 'Add one Beef Noodles' });
    expect(page(container, 'menu').getByRole('heading', { name: 'Noodle House' })).toBeTruthy();
    expect(cartButton().textContent).toContain('$30.00');
  });

  it('prefers the stored cart restaurant over the stored dashboard restaurant', async () => {
    seedSession('menu', 'r1');
    writeStoredCart({ restaurantId: 'r2', items: { d3: 1 } });
    renderDashboard();

    await screen.findByRole('button', { name: 'Add one Beef Noodles' });

    expect(readDashboardSession()?.selectedRestaurantId).toBe('r2');
    expect(cartLabel()).toBe('Cart, 1 item');
  });

  it('keeps the restaurant dashboard page it restored', async () => {
    writeDashboardSession({ customerPage: 'orders', restaurantPage: 'menu', selectedRestaurantId: 'r1' });
    renderDashboard();

    await waitForLoad();

    expect(readDashboardSession()?.restaurantPage).toBe('menu');
  });
});
