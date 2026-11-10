import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { requestJson } from '../../shared/api/client';
import { useAccountActions } from '../account/useAccountActions';
import { logError } from '../../shared/console/outputConsole';
import {
  readDashboardSession,
  writeDashboardSession,
  type RestaurantPage,
} from '../../shared/dashboard/dashboardSession';
import { useScrollToTop } from '../../shared/dashboard/useScrollToTop';
import { MenuPage } from '../restaurant/MenuPage';
import { RestaurantOrders } from '../restaurant/RestaurantOrders';
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
  children,
}: RestaurantDashboardProps) {
  const [restoredDashboard] = useState(readDashboardSession);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(restoredDashboard?.selectedRestaurantId ?? '');
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurantPage, setRestaurantPage] = useState<RestaurantPage>(restoredDashboard?.restaurantPage ?? 'orders');
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

  const loadOrders = useCallback(async () => {
    const query = selectedRestaurant ? `?restaurantId=${encodeURIComponent(selectedRestaurant)}` : '';
    const result = await run(() => requestJson<Order[]>(`/orders${query}`));
    if (result) setOrders(result);
  }, [run, selectedRestaurant]);

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

  async function orderAction(order: Order, action: OrderAction) {
    const body = action === 'reject' ? { reason: window.prompt('Why is this order being rejected?') ?? '' } : undefined;
    if (action === 'reject' && (!body || body.reason.trim().length < 3)) {
      const message = 'Please enter a rejection reason of at least 3 characters.';
      logError('RejectOrderCommand', message);
      showToast(message, 'error');
      return;
    }
    const result = await run(() => requestJson<Order>(`/orders/${order.id}/${action}`, { method: 'POST', body }));
    if (result) {
      const messages = {
        accept: 'Order accepted.',
        reject: 'Order rejected.',
        prepare: 'Order is now being prepared.',
        ready: 'Order marked ready.',
      };
      showToast(messages[action]);
      await loadOrders();
    }
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
  // The Menu and Profile pages draw their own heads; Orders still uses this one until it is rebuilt.
  const pageTitle = restaurantPage === 'orders' ? 'Orders' : null;

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
        {pageTitle ? (
          <div className="restaurant-page-head">
            <p className="eyebrow">{ownedRestaurant ? `${ownedRestaurant.name} · ${pageTitle}` : pageTitle}</p>
            <h1>{pageTitle}</h1>
          </div>
        ) : null}

        {restaurantPage === 'orders' ? (
          <RestaurantOrders
            orders={orders}
            restaurants={restaurants}
            busy={busy}
            onAction={orderAction}
            onRefresh={() => void loadOrders()}
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
            orders={orders}
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
