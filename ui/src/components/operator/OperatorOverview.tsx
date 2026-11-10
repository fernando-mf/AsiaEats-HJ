import type { ReactNode } from 'react';
import { neighbourhoodShortName } from '../../shared/locations/montrealNeighbourhoods';
import type { Order, Restaurant, RestaurantStatus } from '../dashboard/dashboard.types';
import { formatMoney, orderTotal } from '../dashboard/dashboard.utils';
import { IconAlert, IconClock, IconPause, IconPlay, IconReceipt, IconStore } from '../icons/Icons';
import { isSameDay, orderNumber, timeInStatus, useNow } from '../restaurant/orderTime';
// The page header and stat cards share the restaurant overview's styles.
import '../restaurant/restaurant-overview.css';

type OperatorOverviewProps = {
  restaurants: Restaurant[];
  orders: Order[];
  // When the data was last loaded, for the "Updated" label; undefined before the first load.
  updatedAt: Date | undefined;
  busy: string | null;
  onRefresh: () => void;
  onChangeStatus: (restaurant: Restaurant, status: RestaurantStatus) => void;
  // Opens the order on the Orders page.
  onOpenOrder: (orderId: string) => void;
};

// Orders the restaurant still has to work on; picked-up orders belong to delivery (DLV).
const activeStatuses = ['placed', 'accepted', 'preparing', 'ready'];
const refusedStatuses = ['rejected', 'cancelled'];
// A placed order waiting this long for the restaurant to accept it needs attention.
const SLOW_ACCEPT_MINUTES = 5;

const timeFormat = new Intl.DateTimeFormat('en-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

function countBy(orders: Order[], status: string) {
  return orders.filter(order => order.status === status).length;
}

function StatCard({ label, icon, value, note }: { label: string; icon: ReactNode; value: string; note: string }) {
  return (
    <div className="card overview-stat">
      <div className="overview-stat-head">
        <span>{label}</span>
        <span className="overview-stat-icon">{icon}</span>
      </div>
      <strong className="mono">{value}</strong>
      <span className="overview-stat-note">{note}</span>
    </div>
  );
}

function StatusAction({
  restaurant,
  busy,
  onChangeStatus,
}: {
  restaurant: Restaurant;
  busy: string | null;
  onChangeStatus: (restaurant: Restaurant, status: RestaurantStatus) => void;
}) {
  return restaurant.status === 'open' ? (
    <button
      className="secondary-button operator-row-button"
      type="button"
      disabled={busy !== null}
      onClick={() => onChangeStatus(restaurant, 'paused')}
    >
      <IconPause size={15} />
      Pause
    </button>
  ) : (
    <button
      className="soft-button operator-row-button"
      type="button"
      disabled={busy !== null}
      onClick={() => onChangeStatus(restaurant, 'open')}
    >
      <IconPlay size={15} />
      Reopen
    </button>
  );
}

// OperatorOverview is the operator's view of the whole platform: today's numbers, what needs
// attention, and every restaurant with its load and a pause/reopen control.
export function OperatorOverview({
  restaurants,
  orders,
  updatedAt,
  busy,
  onRefresh,
  onChangeStatus,
  onOpenOrder,
}: OperatorOverviewProps) {
  const now = useNow();
  const today = new Date(now);

  const active = orders.filter(order => activeStatuses.includes(order.status));
  const todays = orders.filter(order => isSameDay(order.createdAt, today));
  const refusedToday = todays.filter(order => refusedStatuses.includes(order.status));
  const todaysValue = todays
    .filter(order => !refusedStatuses.includes(order.status))
    .reduce((sum, order) => sum + orderTotal(order), 0);
  const openCount = restaurants.filter(restaurant => restaurant.status === 'open').length;
  const restaurantName = (id: string) => restaurants.find(restaurant => restaurant.id === id)?.name ?? 'Restaurant';

  // Oldest first, so the longest wait is at the top.
  const slowOrders = orders
    .filter(order => order.status === 'placed')
    .filter(order => now - new Date(order.createdAt).getTime() >= SLOW_ACCEPT_MINUTES * 60_000)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const notOpen = restaurants.filter(restaurant => restaurant.status !== 'open');
  const attentionCount = slowOrders.length + notOpen.length;

  return (
    <div className="overview">
      <div className="overview-head">
        <div>
          <p className="eyebrow">
            {updatedAt ? <span className="mono">Updated {timeFormat.format(updatedAt)}</span> : 'Loading…'}
          </p>
          <h1>Platform overview</h1>
        </div>
        <div className="overview-actions">
          <button className="secondary-button" type="button" disabled={busy !== null} onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </div>

      <div className="overview-stats">
        <StatCard
          label="Active orders"
          icon={<IconReceipt size={16} />}
          value={String(active.length)}
          note={`${countBy(active, 'placed')} waiting · ${countBy(active, 'accepted')} queued · ${countBy(active, 'preparing')} preparing · ${countBy(active, 'ready')} ready`}
        />
        <StatCard
          label="Restaurants open"
          icon={<IconStore size={16} />}
          value={`${openCount} / ${restaurants.length}`}
          note={`${restaurants.filter(r => r.status === 'paused').length} paused · ${restaurants.filter(r => r.status === 'closed').length} closed`}
        />
        <StatCard
          label="Orders today"
          icon={<IconClock size={16} />}
          value={String(todays.length)}
          note={`${formatMoney(todaysValue)} not counting refused orders`}
        />
        <StatCard
          label="Refused today"
          icon={<IconAlert size={16} />}
          value={String(refusedToday.length)}
          note={`${countBy(refusedToday, 'rejected')} rejected · ${countBy(refusedToday, 'cancelled')} cancelled`}
        />
      </div>

      <div className="operator-grid">
        <section className="card operator-card" aria-labelledby="operator-restaurants-title">
          <div className="overview-card-head">
            <h2 id="operator-restaurants-title">Restaurants</h2>
            <span className="mono operator-card-note">{restaurants.length} total</span>
          </div>
          {restaurants.length ? (
            <div className="operator-table-wrap">
              <table className="operator-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Area</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="is-number">
                      Active
                    </th>
                    <th scope="col" className="is-number" title="Accepted orders waiting to be prepared">
                      Queue
                    </th>
                    <th scope="col" className="is-action">
                      <span className="visually-hidden">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {restaurants.map(restaurant => {
                    const ofRestaurant = active.filter(order => order.restaurantId === restaurant.id);
                    return (
                      <tr key={restaurant.id}>
                        <th scope="row">{restaurant.name}</th>
                        <td className="operator-muted">
                          {neighbourhoodShortName(restaurant.position.latitude, restaurant.position.longitude) ??
                            'Montréal'}
                        </td>
                        <td>
                          <span className={`restaurant-status status-${restaurant.status}`}>
                            <i />
                            {restaurant.status}
                          </span>
                        </td>
                        <td className="is-number mono">{ofRestaurant.length}</td>
                        <td className="is-number mono">{countBy(ofRestaurant, 'accepted')}</td>
                        <td className="is-action">
                          <StatusAction restaurant={restaurant} busy={busy} onChangeStatus={onChangeStatus} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="overview-empty">No restaurants yet.</p>
          )}
        </section>

        <section className="card operator-card" aria-labelledby="operator-attention-title">
          <div className="overview-card-head">
            <h2 id="operator-attention-title">Needs attention</h2>
            {attentionCount ? <span className="pill pill--amber">{attentionCount}</span> : null}
          </div>
          {attentionCount ? (
            <ul className="operator-attention">
              {slowOrders.map(order => (
                <li key={order.id}>
                  <span className="operator-attention-icon is-amber" aria-hidden="true">
                    <IconClock size={16} />
                  </span>
                  <span className="operator-attention-text">
                    <strong>
                      {orderNumber(order)} waiting {timeInStatus(order, now)}
                    </strong>
                    <span>
                      {restaurantName(order.restaurantId)} hasn’t accepted {order.customerName}’s order yet
                    </span>
                  </span>
                  <button
                    className="secondary-button operator-row-button"
                    type="button"
                    onClick={() => onOpenOrder(order.id)}
                  >
                    View
                  </button>
                </li>
              ))}
              {notOpen.map(restaurant => (
                <li key={restaurant.id}>
                  <span className="operator-attention-icon" aria-hidden="true">
                    <IconPause size={16} />
                  </span>
                  <span className="operator-attention-text">
                    <strong>
                      {restaurant.name} is {restaurant.status}
                    </strong>
                    <span>Customers can’t order from it until it reopens</span>
                  </span>
                  <StatusAction restaurant={restaurant} busy={busy} onChangeStatus={onChangeStatus} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="overview-empty">Nothing needs attention right now.</p>
          )}
        </section>
      </div>
    </div>
  );
}
