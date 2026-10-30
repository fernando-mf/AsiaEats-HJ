import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { requestJson } from '../../shared/api/client';
import { logError } from '../../shared/console/outputConsole';
import {
  readDashboardSession,
  writeDashboardSession,
  type RestaurantPage,
} from '../../shared/dashboard/dashboardSession';
import { MenuManager } from '../restaurant/MenuManager';
import { RestaurantOrders } from '../restaurant/RestaurantOrders';
import { RestaurantProfile } from '../restaurant/RestaurantProfile';
import { DashboardHeader } from './DashboardHeader';
import type {
  Account,
  MenuDraft,
  MenuItem,
  Order,
  OrderAction,
  Restaurant,
  RunAction,
  ShowToast,
} from './dashboard.types';

type RestaurantDashboardProps = {
  account: Account;
  busy: string | null;
  run: RunAction;
  showToast: ShowToast;
  onLogout: () => void;
};

const emptyMenuDraft: MenuDraft = { name: '', price: '', quantity: '0', status: 'available' };

export function RestaurantDashboard({ account, busy, run, showToast, onLogout }: RestaurantDashboardProps) {
  const [restoredDashboard] = useState(readDashboardSession);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(restoredDashboard?.selectedRestaurantId ?? '');
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurantPage, setRestaurantPage] = useState<RestaurantPage>(restoredDashboard?.restaurantPage ?? 'orders');
  const customerPage = restoredDashboard?.customerPage ?? 'restaurants';
  const [menuDraft, setMenuDraft] = useState<MenuDraft>(emptyMenuDraft);
  const [editingMenuItem, setEditingMenuItem] = useState<string | null>(null);
  const [restaurantEmail, setRestaurantEmail] = useState('');
  const [menuQuantities, setMenuQuantities] = useState<Record<string, number>>({});

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
  const ownedRestaurantId = ownedRestaurant?.id;
  const restaurantQuantityKey = ownedRestaurantId ? `asiaeats-menu-quantities-${ownedRestaurantId}` : '';

  useEffect(() => {
    if (!ownedRestaurantId || typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(`asiaeats-menu-quantities-${ownedRestaurantId}`);
      setMenuQuantities(saved ? (JSON.parse(saved) as Record<string, number>) : {});
      setRestaurantEmail(window.localStorage.getItem(`asiaeats-restaurant-email-${ownedRestaurantId}`) ?? '');
    } catch {
      setMenuQuantities({});
    }
  }, [ownedRestaurantId]);

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

  function saveMenuQuantities(next: Record<string, number>) {
    setMenuQuantities(next);
    if (restaurantQuantityKey) window.localStorage.setItem(restaurantQuantityKey, JSON.stringify(next));
  }

  function startEditingMenuItem(item: MenuItem) {
    setEditingMenuItem(item.id);
    setMenuDraft({
      name: item.name,
      price: String(item.price),
      quantity: String(menuQuantities[item.id] ?? 0),
      status: item.status,
    });
  }

  function resetMenuDraft() {
    setEditingMenuItem(null);
    setMenuDraft(emptyMenuDraft);
  }

  async function saveMenuItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ownedRestaurant) return;
    const name = menuDraft.name.trim();
    const price = Number(menuDraft.price);
    const quantity = Number(menuDraft.quantity);
    if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity < 0) {
      const message = 'Enter an item name, a valid non-negative price, and a whole-number quantity.';
      logError(editingMenuItem ? 'UpdateMenuItemCommand' : 'CreateMenuItemCommand', message);
      showToast(message, 'error');
      return;
    }
    const wasEditing = editingMenuItem !== null;
    const body = { name, price, status: menuDraft.status };
    const result = await run(() =>
      requestJson<MenuItem>(
        editingMenuItem
          ? `/restaurants/${ownedRestaurant.id}/menu-items/${editingMenuItem}`
          : `/restaurants/${ownedRestaurant.id}/menu-items`,
        { method: editingMenuItem ? 'PUT' : 'POST', body },
      ),
    );
    if (result) {
      saveMenuQuantities({ ...menuQuantities, [result.id]: quantity });
      showToast(`${result.name} ${wasEditing ? 'updated' : 'created'} successfully.`);
      await loadMenu(ownedRestaurant.id);
      resetMenuDraft();
    }
  }

  async function deleteMenuItem(item: MenuItem) {
    if (!ownedRestaurant || !window.confirm(`Delete “${item.name}” from your menu?`)) return;
    const result = await run(async () => {
      await requestJson<void>(`/restaurants/${ownedRestaurant.id}/menu-items/${item.id}`, { method: 'DELETE' });
      return true;
    });
    if (result !== undefined) {
      const next = { ...menuQuantities };
      delete next[item.id];
      saveMenuQuantities(next);
      showToast(`${item.name} deleted successfully.`);
      await loadMenu(ownedRestaurant.id);
      if (editingMenuItem === item.id) resetMenuDraft();
    }
  }

  function saveRestaurantEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ownedRestaurant) return;
    window.localStorage.setItem(`asiaeats-restaurant-email-${ownedRestaurant.id}`, restaurantEmail.trim());
    showToast('Contact email saved on this device.');
  }

  return (
    <>
      <DashboardHeader account={account} onLogout={onLogout} />
      <div className="dashboard-main customer-main">
        <section className="welcome-banner restaurant-welcome">
          <p className="eyebrow">RESTAURANT PORTAL</p>
          <h1>{ownedRestaurant?.name ?? 'Your restaurant'}</h1>
          <p>Manage your restaurant profile, menu, and incoming orders.</p>
          <div className="restaurant-tabs">
            <button
              className={`nav-button ${restaurantPage === 'orders' ? 'active' : ''}`}
              onClick={() => setRestaurantPage('orders')}
            >
              Incoming orders
            </button>
            <button
              className={`nav-button ${restaurantPage === 'menu' ? 'active' : ''}`}
              onClick={() => setRestaurantPage('menu')}
            >
              Edit menu
            </button>
            <button
              className={`nav-button ${restaurantPage === 'profile' ? 'active' : ''}`}
              onClick={() => setRestaurantPage('profile')}
            >
              Restaurant profile
            </button>
          </div>
        </section>

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
          <MenuManager
            menu={menu}
            draft={menuDraft}
            quantities={menuQuantities}
            editingItemId={editingMenuItem}
            busy={busy}
            onDraftChange={setMenuDraft}
            onSubmit={saveMenuItem}
            onCancelEdit={resetMenuDraft}
            onEdit={startEditingMenuItem}
            onDelete={item => void deleteMenuItem(item)}
            onRefresh={() => ownedRestaurant && void loadMenu(ownedRestaurant.id)}
          />
        ) : null}

        {restaurantPage === 'profile' ? (
          <RestaurantProfile
            account={account}
            restaurant={ownedRestaurant}
            email={restaurantEmail}
            onEmailChange={setRestaurantEmail}
            onSaveEmail={saveRestaurantEmail}
          />
        ) : null}
      </div>
    </>
  );
}
