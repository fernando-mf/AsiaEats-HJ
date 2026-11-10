import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { requestJson } from '../../shared/api/client';
import { useAccountActions } from '../account/useAccountActions';
import {
  readDashboardSession,
  writeDashboardSession,
  type RestaurantPage,
} from '../../shared/dashboard/dashboardSession';
import { useScrollToTop } from '../../shared/dashboard/useScrollToTop';
import { MenuPage } from '../restaurant/MenuPage';
import { OrderBoard } from '../restaurant/OrderBoard';
import { Overview } from '../restaurant/Overview';
import { RestaurantProfile } from '../restaurant/RestaurantProfile';
import { RestaurantSidebar } from '../restaurant/RestaurantSidebar';
import type {
  Account,
  MenuItem,
  MenuItemValues,
  Order,
  OrderAction,
  Position,
  Restaurant,
  RestaurantStatus,
  RunAction,
  ShowToast,
} from './dashboard.types';

type RestaurantDashboardProps = {
  account: Account;
  busy: string | null;
  run: RunAction;
  showToast: ShowToast;
  // Replaces the signed-in account after it is edited, so the header shows the new name.
  onAccountChange: (account: Account) => void;
  onLogout: () => void;
  // Receives a failed background refresh; it ends the session when the session is no longer valid.
  onBackgroundError: (error: unknown) => void;
  // Shown at the end of the content column, beside the sidebar (the console and footer).
  children?: ReactNode;
};

const statusToasts: Record<RestaurantStatus, string> = {
  open: 'Restaurant is open and taking orders.',
  paused: 'Restaurant paused. New orders are stopped.',
  closed: 'Restaurant closed.',
};

export function RestaurantDashboard({
  account,
  busy,
  run,
  showToast,
  onAccountChange,
  onLogout,
  onBackgroundError,
  children,
}: RestaurantDashboardProps) {
  const [restoredDashboard] = useState(readDashboardSession);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(restoredDashboard?.selectedRestaurantId ?? '');
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  // Ids of accepted orders in preparation order; only the first may start preparing.
  const [queue, setQueue] = useState<string[]>([]);
  // The background refresh reads busy through a ref so the timer isn't restarted on every action.
  const busyRef = useRef(busy);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);
  const [restaurantPage, setRestaurantPage] = useState<RestaurantPage>(restoredDashboard?.restaurantPage ?? 'overview');
  useScrollToTop(restaurantPage);
  const customerPage = restoredDashboard?.customerPage ?? 'restaurants';
  const { saveName, changePassword } = useAccountActions(run, showToast, onAccountChange);

  const loadRestaurants = useCallback(async () => {
    const result = await run(() => requestJson<Restaurant[]>('/restaurants'));
    if (result) {
      setRestaurants(result);
      // Restaurant staff only manage (and may only read) their own restaurant.
      const owned = result.find(restaurant => restaurant.ownerId === account.id);
      setSelectedRestaurant(owned?.id ?? '');
    }
  }, [account.id, run]);

  const loadMenu = useCallback(
    async (restaurantId: string) => {
      const result = await run(() => requestJson<MenuItem[]>(`/restaurants/${restaurantId}/menu`));
      if (result) setMenu(result);
    },
    [run],
  );

  // fetchOrders reads the restaurant's orders and its preparation queue (accepted orders, in
  // the order the backend lets them start preparing).
  const fetchOrders = useCallback(async () => {
    const query = selectedRestaurant ? `?restaurantId=${encodeURIComponent(selectedRestaurant)}` : '';
    const [all, queued] = await Promise.all([
      requestJson<Order[]>(`/orders${query}`),
      selectedRestaurant
        ? requestJson<Order[]>(`/restaurants/${selectedRestaurant}/preparation-queue`)
        : Promise.resolve<Order[]>([]),
    ]);
    return { all, queue: queued.map(order => order.id) };
  }, [selectedRestaurant]);

  const loadOrders = useCallback(async () => {
    const result = await run(fetchOrders);
    if (result) {
      setOrders(result.all);
      setQueue(result.queue);
    }
  }, [fetchOrders, run]);

  // New orders arrive without a click: refresh quietly every 15 s, skipping while an action runs.
  // Other failures are left to the next manual action; a session that is no longer valid ends.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (busyRef.current !== null) return;
      fetchOrders()
        .then(result => {
          setOrders(result.all);
          setQueue(result.queue);
        })
        .catch(onBackgroundError);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [fetchOrders, onBackgroundError]);

  useEffect(() => {
    void loadRestaurants();
  }, [loadRestaurants]);

  useEffect(() => {
    if (selectedRestaurant) void loadMenu(selectedRestaurant);
  }, [loadMenu, selectedRestaurant]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    writeDashboardSession({ customerPage, restaurantPage, selectedRestaurantId: selectedRestaurant });
  }, [customerPage, restaurantPage, selectedRestaurant]);

  const ownedRestaurant = restaurants.find(restaurant => restaurant.ownerId === account.id);

  // orderAction moves an order to its next status. Rejecting needs a reason,
  // which the board's reject dialog collects. Resolves to whether the action succeeded.
  async function orderAction(order: Order, action: OrderAction, reason?: string): Promise<boolean> {
    const body = action === 'reject' ? { reason } : undefined;
    const result = await run(() => requestJson<Order>(`/orders/${order.id}/${action}`, { method: 'POST', body }));
    if (!result) return false;
    const number = `#${order.id.slice(0, 8)}`;
    const messages: Record<OrderAction, string> = {
      accept: `${number} accepted and added to the preparation queue.`,
      reject: `${number} rejected.`,
      prepare: `${number} is being prepared.`,
      ready: `${number} is ready for pickup.`,
    };
    showToast(messages[action]);
    await loadOrders();
    return true;
  }

  // saveMenuItem creates a dish (itemId null) or updates one, and swaps the saved dish into the menu.
  async function saveMenuItem(itemId: string | null, values: MenuItemValues): Promise<MenuItem | undefined> {
    if (!ownedRestaurant) return undefined;
    const base = `/restaurants/${ownedRestaurant.id}/menu-items`;
    const result = await run(() =>
      requestJson<MenuItem>(itemId ? `${base}/${itemId}` : base, { method: itemId ? 'PUT' : 'POST', body: values }),
    );
    if (!result) return undefined;
    setMenu(current => (itemId ? current.map(item => (item.id === result.id ? result : item)) : [...current, result]));
    return result;
  }

  // saveDish is what the Menu page's editor calls: saveMenuItem plus a confirmation toast.
  async function saveDish(itemId: string | null, values: MenuItemValues) {
    const result = await saveMenuItem(itemId, values);
    if (result) showToast(itemId ? `${result.name} saved.` : `${result.name} added to your menu.`);
    return result;
  }

  // The availability switch saves the dish with only its status changed.
  async function setAvailability(item: MenuItem, available: boolean) {
    const status = available ? 'available' : 'sold_out';
    const result = await saveMenuItem(item.id, { name: item.name, price: item.price, status });
    if (result) showToast(available ? `${item.name} is available again.` : `${item.name} marked sold out.`);
  }

  async function deleteMenuItem(item: MenuItem): Promise<boolean> {
    if (!ownedRestaurant) return false;
    const result = await run(async () => {
      await requestJson<void>(`/restaurants/${ownedRestaurant.id}/menu-items/${item.id}`, { method: 'DELETE' });
      return true;
    });
    if (!result) return false;
    setMenu(current => current.filter(entry => entry.id !== item.id));
    showToast(`${item.name} deleted.`);
    return true;
  }

  // Swap the saved restaurant into the list, so the banner and status update without a reload.
  function replaceRestaurant(updated: Restaurant) {
    setRestaurants(current => current.map(restaurant => (restaurant.id === updated.id ? updated : restaurant)));
  }

  async function saveDetails(name: string, position: Position): Promise<boolean> {
    if (!ownedRestaurant) return false;
    const result = await run(() =>
      requestJson<Restaurant>(`/restaurants/${ownedRestaurant.id}`, { method: 'PUT', body: { name, position } }),
    );
    if (!result) return false;
    replaceRestaurant(result);
    showToast('Restaurant details saved.');
    return true;
  }

  async function changeStatus(status: RestaurantStatus) {
    if (!ownedRestaurant) return;
    const result = await run(() =>
      requestJson<Restaurant>(`/restaurants/${ownedRestaurant.id}/status`, { method: 'PUT', body: { status } }),
    );
    if (result) {
      replaceRestaurant(result);
      showToast(statusToasts[status]);
    }
  }

  // The sidebar switch only moves between Open and Paused; a closed restaurant turns it on to open.
  function toggleAccepting() {
    if (!ownedRestaurant) return;
    void changeStatus(ownedRestaurant.status === 'open' ? 'paused' : 'open');
  }

  const newOrderCount = orders.filter(order => order.status === 'placed').length;

  return (
    <div className="restaurant-shell">
      <RestaurantSidebar
        account={account}
        restaurant={ownedRestaurant}
        page={restaurantPage}
        newOrderCount={newOrderCount}
        busy={busy}
        onPageChange={setRestaurantPage}
        onToggleAccepting={toggleAccepting}
        onLogout={onLogout}
      />
      <div className="restaurant-main">
        {restaurantPage === 'overview' ? (
          <Overview
            account={account}
            restaurant={ownedRestaurant}
            orders={orders}
            menu={menu}
            busy={busy}
            onAction={orderAction}
            onSetAvailability={(item, available) => void setAvailability(item, available)}
            onNavigate={setRestaurantPage}
          />
        ) : null}

        {restaurantPage === 'orders' ? (
          <OrderBoard
            restaurant={ownedRestaurant}
            orders={orders}
            queue={queue}
            busy={busy}
            onAction={orderAction}
            onRefresh={() => void loadOrders()}
            onToggleAccepting={toggleAccepting}
          />
        ) : null}

        {restaurantPage === 'menu' ? (
          <MenuPage
            restaurant={ownedRestaurant}
            menu={menu}
            busy={busy}
            onSave={saveDish}
            onSetAvailability={(item, available) => void setAvailability(item, available)}
            onDelete={deleteMenuItem}
          />
        ) : null}

        {restaurantPage === 'profile' ? (
          <RestaurantProfile
            account={account}
            restaurant={ownedRestaurant}
            menu={menu}
            busy={busy}
            onSaveDetails={saveDetails}
            onChangeStatus={status => void changeStatus(status)}
            onSaveName={saveName}
            onChangePassword={changePassword}
          />
        ) : null}

        {children}
      </div>
    </div>
  );
}
