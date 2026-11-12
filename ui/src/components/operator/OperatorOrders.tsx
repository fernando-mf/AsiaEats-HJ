import { useState } from 'react';
import type { Order, Restaurant, StoredEvent } from '../dashboard/dashboard.types';
import { chargedTotal, formatMoney } from '../dashboard/dashboard.utils';
import { IconSearch } from '../icons/Icons';
import { orderNumber } from '../restaurant/orderTime';
import { OrderPanel } from './OrderPanel';
// The search box and tabs share the restaurant orders board's styles.
import '../restaurant/restaurant-orders.css';

type OperatorOrdersProps = {
  orders: Order[];
  restaurants: Restaurant[];
  selectedId: string | null;
  // Events of the selected order, oldest first; undefined while they load, null if they could not be.
  events: StoredEvent[] | null | undefined;
  updatedAt: Date | undefined;
  busy: string | null;
  onSelect: (orderId: string | null) => void;
  onRefresh: () => void;
  onCancel: (order: Order) => void;
};

type Tab = 'active' | 'completed' | 'stopped';

const tabs: Array<[Tab, string]> = [
  ['active', 'Active'],
  ['completed', 'Completed'],
  ['stopped', 'Rejected & cancelled'],
];

// The same split as the restaurant orders board.
const tabStatuses: Record<Tab, string[]> = {
  active: ['placed', 'accepted', 'preparing', 'ready'],
  completed: ['picked_up', 'delivered', 'refunded'],
  stopped: ['rejected', 'cancelled'],
};

const uncharged = (order: Order) => order.status === 'rejected' || order.status === 'cancelled';

const placedFormat = new Intl.DateTimeFormat('en-CA', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const timeFormat = new Intl.DateTimeFormat('en-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// OperatorOrders lists every order on the platform, split like the restaurant board, with a
// panel for the selected one.
export function OperatorOrders({
  orders,
  restaurants,
  selectedId,
  events,
  updatedAt,
  busy,
  onSelect,
  onRefresh,
  onCancel,
}: OperatorOrdersProps) {
  const [tab, setTab] = useState<Tab>('active');
  const [query, setQuery] = useState('');
  const search = query.trim().toLowerCase();

  const restaurantName = (id: string) => restaurants.find(restaurant => restaurant.id === id)?.name ?? 'Restaurant';
  const matches = (order: Order) => {
    if (!search) return true;
    return (
      order.id.startsWith(search.replace(/^#/, '')) ||
      order.customerName.toLowerCase().includes(search) ||
      restaurantName(order.restaurantId).toLowerCase().includes(search) ||
      order.lines.some(line => line.name.toLowerCase().includes(search))
    );
  };

  const counts = Object.fromEntries(
    tabs.map(([value]) => [value, orders.filter(order => tabStatuses[value].includes(order.status)).length]),
  ) as Record<Tab, number>;
  const visible = orders.filter(order => tabStatuses[tab].includes(order.status) && matches(order));
  const selected = orders.find(order => order.id === selectedId);

  return (
    <div className="overview">
      <div className="overview-head">
        <div>
          <p className="eyebrow">
            {updatedAt ? <span className="mono">Updated {timeFormat.format(updatedAt)}</span> : 'Loading…'}
          </p>
          <h1>All orders</h1>
        </div>
        <div className="overview-actions">
          <label className="board-search">
            <IconSearch size={16} />
            <input
              type="search"
              aria-label="Search orders"
              placeholder="Order #, customer, restaurant"
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
          </label>
          <button className="secondary-button" type="button" disabled={busy !== null} onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </div>

      <div className="board-tabs" role="tablist" aria-label="Order lists">
        {tabs.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            className="board-tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
          >
            {label}
            <span className="mono">{counts[value]}</span>
          </button>
        ))}
      </div>

      <div className={`operator-orders${selected ? ' has-panel' : ''}`}>
        <section className="card operator-card" aria-label="Orders">
          {visible.length ? (
            <div className="operator-table-wrap">
              <table className="operator-table operator-orders-table">
                <thead>
                  <tr>
                    <th scope="col">Order</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Restaurant</th>
                    <th scope="col" className="is-number">
                      Total
                    </th>
                    <th scope="col">Status</th>
                    <th scope="col">Placed</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map(order => (
                    <tr
                      key={order.id}
                      className={order.id === selectedId ? 'is-selected' : undefined}
                      onClick={() => onSelect(order.id)}
                    >
                      <th scope="row">
                        <button
                          className="operator-order-link mono"
                          type="button"
                          aria-pressed={order.id === selectedId}
                          onClick={event => {
                            event.stopPropagation();
                            onSelect(order.id);
                          }}
                        >
                          {orderNumber(order)}
                        </button>
                      </th>
                      <td>{order.customerName}</td>
                      <td className="operator-muted">{restaurantName(order.restaurantId)}</td>
                      <td
                        className={`is-number mono${uncharged(order) ? ' operator-muted' : ''}${order.billing?.ledger.refund ? ' money-refunded' : ''}`}
                      >
                        {uncharged(order) ? 'Not charged' : formatMoney(chargedTotal(order))}
                      </td>
                      <td>
                        <span className={`order-status status-pill-${order.status}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="operator-muted">{placedFormat.format(new Date(order.createdAt))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="overview-empty">{search ? 'No orders match your search.' : 'No orders here yet.'}</p>
          )}
        </section>

        {selected ? (
          <OrderPanel
            order={selected}
            restaurants={restaurants}
            events={events}
            busy={busy}
            onClose={() => onSelect(null)}
            onCancel={onCancel}
          />
        ) : null}
      </div>
    </div>
  );
}
