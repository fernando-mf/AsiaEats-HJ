import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { readStoredCart, writeStoredCart } from '../../shared/cart/cartStorage';
import {
  readDashboardSession,
  writeDashboardSession,
  type CustomerPage,
} from '../../shared/dashboard/dashboardSession';
import { useScrollToTop } from '../../shared/dashboard/useScrollToTop';
import { requestJson } from '../../shared/api/client';
import { CartView } from '../customer/CartView';
import { CustomerProfile } from '../customer/CustomerProfile';
import { OrdersPage } from '../customer/OrdersPage';
import { CustomerHome } from '../customer/CustomerHome';
import { RestaurantMenu } from '../customer/RestaurantMenu';
import { DashboardHeader } from './DashboardHeader';
import type {
  Account,
  Address,
  CustomerProfileResponse,
  MenuItem,
  Order,
  Restaurant,
  RunAction,
  ShowToast,
} from './dashboard.types';

type CustomerDashboardProps = {
  account: Account;
  busy: string | null;
  run: RunAction;
  showToast: ShowToast;
  onLogout: () => void;
};

export function CustomerDashboard({ account, busy, run, showToast, onLogout }: CustomerDashboardProps) {
  const [restoredDashboard] = useState(readDashboardSession);
  const [restoredCart] = useState(readStoredCart);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(
    restoredCart?.restaurantId ?? restoredDashboard?.selectedRestaurantId ?? '',
  );
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>(restoredCart?.items ?? {});
  const [pendingRestaurantId, setPendingRestaurantId] = useState<string | null>(null);
  // A dish waiting to be added once the customer confirms switching restaurants.
  const [pendingDish, setPendingDish] = useState<MenuItem | null>(null);
  // Every restaurant's menu, keyed by restaurant id, for the home page's dish search and rows.
  const [menus, setMenus] = useState<Record<string, MenuItem[]>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  // undefined while loading, null when the customer has not set an address.
  const [address, setAddress] = useState<Address | null | undefined>(undefined);
  const [customerPage, setCustomerPage] = useState<CustomerPage>(restoredDashboard?.customerPage ?? 'restaurants');
  const restaurantPage = restoredDashboard?.restaurantPage ?? 'orders';
  const restaurantSwitchDialogRef = useRef<HTMLDialogElement>(null);
  useScrollToTop(customerPage);

  // Searching from the customer's address makes the backend return distances, nearest first.
  const loadRestaurants = useCallback(async () => {
    const from = address ? `?lat=${address.latitude}&lon=${address.longitude}` : '';
    const result = await run(() => requestJson<Restaurant[]>(`/restaurants${from}`));
    if (!result) return;
    setRestaurants(result);
    setSelectedRestaurant(current => current || result[0]?.id || '');

    const entries = await run(() =>
      Promise.all(
        result.map(
          async restaurant =>
            [restaurant.id, await requestJson<MenuItem[]>(`/restaurants/${restaurant.id}/menu`)] as const,
        ),
      ),
    );
    if (entries) setMenus(Object.fromEntries(entries));
  }, [address, run]);

  const loadMenu = useCallback(
    async (restaurantId: string) => {
      const result = await run(() => requestJson<MenuItem[]>(`/restaurants/${restaurantId}/menu`));
      if (result) setMenu(result);
    },
    [run],
  );

  const loadOrders = useCallback(async () => {
    const result = await run(() => requestJson<Order[]>(`/orders?customerId=${encodeURIComponent(account.id)}`));
    if (result) setOrders(result);
  }, [account.id, run]);

  const loadProfile = useCallback(async () => {
    const result = await run(() => requestJson<CustomerProfileResponse>('/customers/me'));
    // A failed profile load counts as "no address" so restaurants still load.
    setAddress(result ? result.address : null);
  }, [run]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  // Restaurants wait for the profile, since the address decides the distances.
  useEffect(() => {
    if (address !== undefined) void loadRestaurants();
  }, [address, loadRestaurants]);

  useEffect(() => {
    if (selectedRestaurant) void loadMenu(selectedRestaurant);
  }, [loadMenu, selectedRestaurant]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const dialog = restaurantSwitchDialogRef.current;
    if (!dialog) return;
    if (pendingRestaurantId && !dialog.open) dialog.showModal();
    if (!pendingRestaurantId && dialog.open) dialog.close();
  }, [pendingRestaurantId]);

  useEffect(() => {
    writeStoredCart({ restaurantId: selectedRestaurant, items: cart });
  }, [cart, selectedRestaurant]);

  useEffect(() => {
    writeDashboardSession({ customerPage, restaurantPage, selectedRestaurantId: selectedRestaurant });
  }, [customerPage, restaurantPage, selectedRestaurant]);

  const selected = restaurants.find(restaurant => restaurant.id === selectedRestaurant);
  const pendingRestaurant = restaurants.find(restaurant => restaurant.id === pendingRestaurantId);
  const cartLines = useMemo(
    () => menu.filter(item => cart[item.id]).map(item => ({ item, quantity: cart[item.id] })),
    [cart, menu],
  );
  const cartTotal = cartLines.reduce((sum, line) => sum + line.item.price * line.quantity, 0);
  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);

  function addToCart(item: MenuItem) {
    setCart(current => ({ ...current, [item.id]: (current[item.id] ?? 0) + 1 }));
    showToast(`${item.name} added to cart.`);
  }

  function changeQuantity(item: MenuItem, delta: number) {
    const removesItem = cart[item.id] !== undefined && cart[item.id] + delta <= 0;
    setCart(current => {
      const next = { ...current };
      const quantity = (next[item.id] ?? 0) + delta;
      if (quantity <= 0) delete next[item.id];
      else next[item.id] = quantity;
      return next;
    });
    if (removesItem) showToast(`${item.name} removed from cart.`);
  }

  function selectRestaurant(restaurantId: string) {
    const isDifferentRestaurant = selectedRestaurant !== restaurantId;
    const cartHasItems = Object.keys(cart).length > 0;

    if (isDifferentRestaurant && cartHasItems) {
      setPendingRestaurantId(restaurantId);
      return;
    }

    setSelectedRestaurant(restaurantId);
    setCustomerPage('menu');
  }

  // addDish adds a dish from any restaurant (e.g. from the home page). A cart holds one
  // restaurant's items, so a dish from another restaurant asks to switch first.
  function addDish(item: MenuItem) {
    const otherRestaurant = item.restaurantId !== selectedRestaurant;
    if (otherRestaurant && Object.keys(cart).length > 0) {
      setPendingDish(item);
      setPendingRestaurantId(item.restaurantId);
      return;
    }
    if (otherRestaurant) setSelectedRestaurant(item.restaurantId);
    addToCart(item);
  }

  function cancelRestaurantSwitch() {
    setPendingRestaurantId(null);
    setPendingDish(null);
  }

  function confirmRestaurantSwitch() {
    if (!pendingRestaurantId) return;
    if (pendingDish) {
      setCart({ [pendingDish.id]: 1 });
      setSelectedRestaurant(pendingRestaurantId);
      setPendingRestaurantId(null);
      setPendingDish(null);
      showToast(`Cart cleared. ${pendingDish.name} added to cart.`);
      return;
    }
    const restaurantName = pendingRestaurant?.name ?? 'the selected restaurant';
    setCart({});
    setSelectedRestaurant(pendingRestaurantId);
    setCustomerPage('menu');
    setPendingRestaurantId(null);
    showToast(`Cart cleared. Now browsing ${restaurantName}.`);
  }

  async function cancelOrder(order: Order) {
    if (!window.confirm(`Cancel order #${order.id.slice(0, 8)}?`)) return;
    const result = await run(() => requestJson<Order>(`/orders/${order.id}/cancel`, { method: 'POST' }));
    if (result) {
      showToast('Order cancelled.');
      await loadOrders();
    }
  }

  async function placeOrder() {
    if (!selectedRestaurant || !cartLines.length) return;
    const result = await run(() =>
      requestJson<Order>('/orders', {
        method: 'POST',
        body: {
          restaurantId: selectedRestaurant,
          items: cartLines.map(({ item, quantity }) => ({ menuItemId: item.id, quantity })),
        },
      }),
    );
    if (result) {
      setCart({});
      setCustomerPage('orders');
      showToast('Order placed successfully.');
      await loadOrders();
    }
  }

  return (
    <>
      <DashboardHeader
        account={account}
        cartCount={cartCount}
        cartTotal={cartTotal}
        deliveryAddress={address === undefined ? undefined : (address?.street ?? null)}
        customerPage={customerPage}
        onCustomerPageChange={setCustomerPage}
        onLogout={onLogout}
      />

      <dialog
        ref={restaurantSwitchDialogRef}
        className="restaurant-switch-dialog"
        aria-labelledby="restaurant-switch-title"
        aria-describedby="restaurant-switch-description"
        onCancel={event => {
          event.preventDefault();
          cancelRestaurantSwitch();
        }}
      >
        <div className="restaurant-switch-dialog-content">
          <h2 id="restaurant-switch-title">Switch to {pendingRestaurant?.name ?? 'another restaurant'}?</h2>
          <p id="restaurant-switch-description">
            Your cart contains items from another restaurant. Switching restaurants will clear your cart. Do you want to
            continue?
          </p>
          <div className="restaurant-switch-dialog-actions">
            <button className="secondary-button" type="button" autoFocus onClick={cancelRestaurantSwitch}>
              Keep my cart
            </button>
            <button className="danger-button restaurant-switch-confirm" type="button" onClick={confirmRestaurantSwitch}>
              Switch and clear cart
            </button>
          </div>
        </div>
      </dialog>

      <div className="dashboard-main customer-main">
        {customerPage === 'restaurants' ? (
          <CustomerHome
            restaurants={restaurants}
            menus={menus}
            hasAddress={Boolean(address)}
            recentOrders={orders.slice(0, 3)}
            busy={busy}
            onRefresh={() => void loadRestaurants()}
            onOpenRestaurant={selectRestaurant}
            onAddDish={addDish}
            onViewAllOrders={() => setCustomerPage('orders')}
          />
        ) : null}

        {customerPage === 'menu' ? (
          <RestaurantMenu
            restaurant={selected}
            menu={menu}
            cart={cart}
            cartCount={cartCount}
            busy={busy}
            onBack={() => setCustomerPage('restaurants')}
            onViewCart={() => setCustomerPage('cart')}
            onAddToCart={addToCart}
          />
        ) : null}

        {customerPage === 'cart' ? (
          <CartView
            restaurant={selected}
            lines={cartLines}
            total={cartTotal}
            busy={busy}
            onChangeQuantity={changeQuantity}
            onPlaceOrder={() => void placeOrder()}
            onContinueBrowsing={() => setCustomerPage('menu')}
            onBrowseRestaurants={() => setCustomerPage('restaurants')}
          />
        ) : null}

        {customerPage === 'orders' ? (
          <OrdersPage
            orders={orders}
            restaurants={restaurants}
            address={address}
            busy={busy}
            onRefreshOrders={() => void loadOrders()}
            onFindRestaurants={() => setCustomerPage('restaurants')}
            onOpenRestaurant={selectRestaurant}
            onCancelOrder={order => void cancelOrder(order)}
          />
        ) : null}

        {customerPage === 'profile' ? <CustomerProfile account={account} /> : null}
      </div>
    </>
  );
}
