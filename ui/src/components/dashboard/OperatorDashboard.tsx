import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ApiError, apiErrorMessage, requestJson } from '../../shared/api/client';
import { useScrollToTop } from '../../shared/dashboard/useScrollToTop';
import { ConfirmDialog } from '../feedback/ConfirmDialog';
import { CityMap } from '../operator/CityMap';
import { OperatorOrders } from '../operator/OperatorOrders';
import { OperatorOverview } from '../operator/OperatorOverview';
import { orderNumber } from '../restaurant/orderTime';
import { OperatorSidebar, type OperatorPage } from '../operator/OperatorSidebar';
import { RestoreDialog } from '../operator/RestoreDialog';
import type {
  Account,
  CourierSummary,
  Order,
  Restaurant,
  RestaurantStatus,
  RunAction,
  ShowToast,
  StoredEvent,
} from './dashboard.types';

type OperatorDashboardProps = {
  account: Account;
  busy: string | null;
  run: RunAction;
  showToast: ShowToast;
  onLogout: () => void;
  // Receives a failed background refresh; it ends the session when the session is no longer valid.
  onBackgroundError: (error: unknown) => void;
  // Shown at the end of the content column, beside the sidebar (the console and footer).
  children?: ReactNode;
};

const statusToasts: Record<RestaurantStatus, string> = {
  open: 'reopened and taking orders.',
  paused: 'paused. New orders are stopped.',
  closed: 'closed.',
};

// OperatorDashboard is the platform operator's console. Operators see every restaurant and
// every order, and may pause or reopen any restaurant.
export function OperatorDashboard({
  account,
  busy,
  run,
  showToast,
  onLogout,
  onBackgroundError,
  children,
}: OperatorDashboardProps) {
  const [page, setPage] = useState<OperatorPage>('overview');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [couriers, setCouriers] = useState<CourierSummary[]>([]);
  const [updatedAt, setUpdatedAt] = useState<Date>();
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  // The order waiting for the operator to confirm its cancellation.
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  // The selected order's events: null when they could not be loaded.
  const [orderEvents, setOrderEvents] = useState<{ orderId: string; events: StoredEvent[] | null }>();
  // The background refresh reads busy through a ref so the timer isn't restarted on every action.
  const busyRef = useRef(busy);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);
  useScrollToTop(page);

  const fetchAll = useCallback(async () => {
    const [allRestaurants, allOrders, allCouriers] = await Promise.all([
      requestJson<Restaurant[]>('/restaurants'),
      requestJson<Order[]>('/orders'),
      requestJson<CourierSummary[]>('/couriers'),
    ]);
    return { restaurants: allRestaurants, orders: allOrders, couriers: allCouriers };
  }, []);

  const apply = useCallback(
    (result: { restaurants: Restaurant[]; orders: Order[]; couriers: CourierSummary[] }) => {
      setRestaurants(result.restaurants);
      setOrders(result.orders);
      setCouriers(result.couriers);
      setUpdatedAt(new Date());
    },
    [],
  );

  const load = useCallback(async () => {
    const result = await run(fetchAll);
    if (result) apply(result);
  }, [apply, fetchAll, run]);

  useEffect(() => {
    void load();
  }, [load]);

  // Orders change without the operator doing anything: refresh quietly every 15 s, skipping
  // while an action runs. Other failures are left to the next manual action; a session that is
  // no longer valid ends.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (busyRef.current !== null) return;
      fetchAll().then(apply).catch(onBackgroundError);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [apply, fetchAll, onBackgroundError]);

  // Load the selected order's event history, and load it again whenever the order changes
  // (its updatedAt moves), so a new state change shows up with its event id.
  const selectedUpdatedAt = orders.find(order => order.id === selectedOrderId)?.updatedAt;
  useEffect(() => {
    if (!selectedOrderId) return;
    let current = true;
    requestJson<StoredEvent[]>(`/events?entityType=order&entityId=${encodeURIComponent(selectedOrderId)}`)
      .then(events => {
        if (current) setOrderEvents({ orderId: selectedOrderId, events });
      })
      .catch((error: unknown) => {
        if (!current) return;
        setOrderEvents({ orderId: selectedOrderId, events: null });
        // An invalid session ends the session; anything else is reported here.
        if (error instanceof ApiError && error.code === 'unauthenticated') onBackgroundError(error);
        else showToast(apiErrorMessage(error), 'error');
      });
    return () => {
      current = false;
    };
  }, [onBackgroundError, selectedOrderId, selectedUpdatedAt, showToast]);

  // Keep showing the previous history of the same order while it reloads.
  const events = orderEvents?.orderId === selectedOrderId ? orderEvents.events : undefined;

  function openOrder(orderId: string) {
    setSelectedOrderId(orderId);
    setPage('orders');
  }

  // Operators may cancel an order at any stage until it is finished, after confirming.
  async function cancelOrder(order: Order) {
    const result = await run(() => requestJson<Order>(`/orders/${order.id}/cancel`, { method: 'POST' }));
    setCancelTarget(null);
    if (!result) return;
    setOrders(current => current.map(item => (item.id === result.id ? result : item)));
    showToast(`Order ${orderNumber(order)} cancelled.`);
  }

  async function changeStatus(restaurant: Restaurant, status: RestaurantStatus) {
    const result = await run(() =>
      requestJson<Restaurant>(`/restaurants/${restaurant.id}/status`, { method: 'PUT', body: { status } }),
    );
    if (!result) return;
    setRestaurants(current => current.map(item => (item.id === result.id ? result : item)));
    showToast(`${result.name} ${statusToasts[result.status]}`);
  }

  // Restoring re-creates every account with a new id, so this session's token no longer names
  // an account: sign out once it succeeds. The operator may always call it, so a "forbidden"
  // answer means the server has it switched off.
  async function restore() {
    const outcome = await run(async () => {
      try {
        await requestJson<void>('/env/reset', { method: 'POST' });
        return 'restored' as const;
      } catch (error) {
        if (error instanceof ApiError && error.code === 'forbidden') return 'disabled' as const;
        throw error;
      }
    });
    setRestoreOpen(false);
    if (outcome === 'restored') onLogout();
    if (outcome === 'disabled') {
      showToast(
        'Restoring is turned off on this server. Set ENV_MANAGER_ENABLED=true and restart the backend.',
        'error',
      );
    }
  }

  return (
    <div className="restaurant-shell">
      <OperatorSidebar
        account={account}
        page={page}
        waitingCount={orders.filter(order => order.status === 'placed').length}
        busy={busy}
        onPageChange={setPage}
        onRestore={() => setRestoreOpen(true)}
        onLogout={onLogout}
      />

      <div className="restaurant-main">
        {page === 'overview' ? (
          <OperatorOverview
            restaurants={restaurants}
            orders={orders}
            updatedAt={updatedAt}
            busy={busy}
            onRefresh={() => void load()}
            onChangeStatus={(restaurant, status) => void changeStatus(restaurant, status)}
            onOpenOrder={openOrder}
          />
        ) : null}

        {page === 'orders' ? (
          <OperatorOrders
            orders={orders}
            restaurants={restaurants}
            selectedId={selectedOrderId}
            events={events}
            updatedAt={updatedAt}
            busy={busy}
            onSelect={setSelectedOrderId}
            onRefresh={() => void load()}
            onCancel={setCancelTarget}
          />
        ) : null}

        {page === 'map' ? (
          <CityMap
            couriers={couriers}
            restaurants={restaurants}
            orders={orders}
            updatedAt={updatedAt}
            busy={busy}
            onRefresh={() => void load()}
          />
        ) : null}

        {children}
      </div>

      <ConfirmDialog
        open={cancelTarget !== null}
        title={cancelTarget ? `Cancel order ${orderNumber(cancelTarget)}?` : 'Cancel order?'}
        confirmLabel="Cancel order"
        busyLabel="Cancelling…"
        cancelLabel="Keep order"
        busy={busy !== null}
        onCancel={() => setCancelTarget(null)}
        onConfirm={() => {
          if (cancelTarget) void cancelOrder(cancelTarget);
        }}
      >
        {cancelTarget ? (
          <p>
            {cancelTarget.customerName}’s order from{' '}
            {restaurants.find(restaurant => restaurant.id === cancelTarget.restaurantId)?.name ?? 'the restaurant'} is
            cancelled and leaves the restaurant’s board. This can’t be undone.
          </p>
        ) : null}
      </ConfirmDialog>

      <RestoreDialog
        open={restoreOpen}
        busy={busy !== null}
        onCancel={() => setRestoreOpen(false)}
        onConfirm={() => void restore()}
      />
    </div>
  );
}
