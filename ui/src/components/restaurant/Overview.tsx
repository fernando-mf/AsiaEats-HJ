import { useState, type ReactNode } from 'react';
import type { RestaurantPage } from '../../shared/dashboard/dashboardSession';
import { IconArrowRight, IconBag, IconCheck, IconClock, IconMenuBook, IconPencil, IconReceipt } from '../icons/Icons';
import type { Account, MenuItem, Order, OrderAction, Restaurant } from '../dashboard/dashboard.types';
import { formatMoney, isUncharged, orderTotal } from '../dashboard/dashboard.utils';
import { isSameDay, orderNumber, timeInStatus, useNow } from './orderTime';
import { RejectDialog } from './RejectDialog';
import './restaurant-overview.css';

type OverviewProps = {
  account: Account;
  restaurant?: Restaurant;
  orders: Order[];
  menu: MenuItem[];
  busy: string | null;
  onAction: (order: Order, action: OrderAction, reason?: string) => Promise<boolean>;
  onSetAvailability: (item: MenuItem, available: boolean) => void;
  onNavigate: (page: RestaurantPage) => void;
};

// Columns show the few most urgent orders; the full list is on the Orders board.
const columnLimit = 3;
// Dishes shown in the availability card; the rest are on the Menu page.
const menuLimit = 6;

const dateFormat = new Intl.DateTimeFormat('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false });

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function itemCount(order: Order) {
  const count = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  return `${count} ${count === 1 ? 'item' : 'items'}`;
}

const byOldest = (a: Order, b: Order) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

// Overview is the restaurant's landing page: today's numbers, the orders that need a hand
// next, orders per hour, and quick sold-out switches.
export function Overview({
  account,
  restaurant,
  orders,
  menu,
  busy,
  onAction,
  onSetAvailability,
  onNavigate,
}: OverviewProps) {
  const now = useNow();
  const [rejecting, setRejecting] = useState<Order | null>(null);
  const today = new Date(now);

  const todays = orders.filter(order => isSameDay(order.createdAt, today));
  const placed = orders.filter(order => order.status === 'placed').sort(byOldest);
  const accepted = orders.filter(order => order.status === 'accepted');
  const preparing = orders.filter(order => order.status === 'preparing').sort(byOldest);
  const ready = orders.filter(order => order.status === 'ready').sort(byOldest);
  const soldOut = menu.filter(item => item.status === 'sold_out');
  // Cancelled and rejected orders are never charged, so they don't count toward revenue.
  const revenue = todays.filter(order => !isUncharged(order)).reduce((sum, order) => sum + orderTotal(order), 0);

  const stats = [
    {
      label: 'Orders today',
      value: String(todays.length),
      note: placed.length ? `${placed.length} waiting to accept` : 'None waiting to accept',
      icon: <IconReceipt size={16} />,
    },
    {
      label: 'Revenue today',
      value: formatMoney(revenue),
      note: 'Excludes rejected and cancelled',
      icon: <IconBag size={16} />,
    },
    {
      label: 'In the kitchen',
      value: String(accepted.length + preparing.length),
      note: `${accepted.length} queued · ${preparing.length} preparing`,
      icon: <IconClock size={16} />,
    },
    {
      label: 'Sold out',
      value: String(soldOut.length),
      note: `of ${menu.length} ${menu.length === 1 ? 'dish' : 'dishes'}`,
      icon: <IconMenuBook size={16} />,
    },
  ];

  // Sold-out dishes first, since those are the ones to bring back.
  const menuRows = [...menu].sort((a, b) => Number(a.status === 'available') - Number(b.status === 'available'));

  return (
    <div className="overview">
      <div className="overview-head">
        <div>
          <p className="eyebrow mono">
            {dateFormat.format(today)} · {timeFormat.format(today)}
          </p>
          <h1>
            {greeting(today.getHours())}, {account.name.split(' ')[0]}
          </h1>
        </div>
        <div className="overview-actions">
          <button className="secondary-button" type="button" onClick={() => onNavigate('menu')}>
            <IconPencil size={16} />
            Edit menu
          </button>
          <button className="primary-button" type="button" onClick={() => onNavigate('orders')}>
            Open order board
            <IconArrowRight size={16} />
          </button>
        </div>
      </div>

      {restaurant && restaurant.status !== 'open' ? (
        <p className="restaurant-notice" role="status">
          {restaurant.status === 'paused' ? 'New orders are paused.' : 'Your restaurant is closed.'} Turn on Accepting
          orders in the sidebar to take orders again.
        </p>
      ) : null}

      <div className="overview-stats">
        {stats.map(stat => (
          <section className="card overview-stat" key={stat.label}>
            <div className="overview-stat-head">
              <span>{stat.label}</span>
              <span className="overview-stat-icon" aria-hidden="true">
                {stat.icon}
              </span>
            </div>
            <strong>{stat.value}</strong>
            <span className="overview-stat-note">{stat.note}</span>
          </section>
        ))}
      </div>

      <div className="overview-columns">
        <OverviewColumn
          title="Incoming"
          pill="pill--primary"
          orders={placed}
          empty="No new orders."
          onMore={() => onNavigate('orders')}
          render={order => (
            <>
              <span className="overview-order-meta">
                {itemCount(order)} · {formatMoney(orderTotal(order))} · {timeInStatus(order, now)}
              </span>
              <div className="overview-order-actions">
                <button
                  className="primary-button small"
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void onAction(order, 'accept')}
                >
                  <IconCheck size={15} />
                  Accept
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={busy !== null}
                  onClick={() => setRejecting(order)}
                >
                  Reject
                </button>
              </div>
            </>
          )}
        />
        <OverviewColumn
          title="Preparing"
          pill="pill--amber"
          orders={preparing}
          empty={accepted.length ? `${accepted.length} accepted, waiting to start.` : 'Nothing in the kitchen.'}
          note={accepted.length && preparing.length ? `${accepted.length} more queued` : undefined}
          onMore={() => onNavigate('orders')}
          render={order => (
            <span className="overview-order-meta">
              {itemCount(order)} · started {timeInStatus(order, now)}
              {timeInStatus(order, now) === 'just now' ? '' : ' ago'}
            </span>
          )}
        />
        <OverviewColumn
          title="Ready for pickup"
          pill="pill--green"
          orders={ready}
          empty="Nothing waiting for pickup."
          onMore={() => onNavigate('orders')}
          render={order => (
            <>
              <span className="overview-order-meta">
                {itemCount(order)} · ready {timeInStatus(order, now)}
                {timeInStatus(order, now) === 'just now' ? '' : ' ago'}
              </span>
              <span className="overview-order-note">
                <IconClock size={14} />
                Waiting for pickup
              </span>
            </>
          )}
        />
      </div>

      <div className="overview-bottom">
        <OrdersByHour orders={todays} now={today} />

        <section className="card overview-menu" aria-labelledby="overview-menu-title">
          <div className="overview-card-head">
            <h2 id="overview-menu-title">Menu availability</h2>
            <button className="text-button" type="button" onClick={() => onNavigate('menu')}>
              Manage menu
            </button>
          </div>
          {menuRows.length ? (
            menuRows.slice(0, menuLimit).map(item => {
              const available = item.status === 'available';
              return (
                <div className={`overview-menu-row${available ? '' : ' is-sold-out'}`} key={item.id}>
                  <span className="overview-menu-name">{item.name}</span>
                  <span className="mono overview-menu-price">{formatMoney(item.price)}</span>
                  <span className={`restaurant-status status-${available ? 'open' : 'closed'}`}>
                    <i aria-hidden="true" />
                    {available ? 'Available' : 'Sold out'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    className="switch"
                    aria-checked={available}
                    aria-label={`Available: ${item.name}`}
                    disabled={busy !== null}
                    onClick={() => onSetAvailability(item, !available)}
                  >
                    <span />
                  </button>
                </div>
              );
            })
          ) : (
            <p className="overview-empty">Your menu is empty. Add dishes on the Menu page.</p>
          )}
          {menuRows.length > menuLimit ? (
            <p className="overview-more">{menuRows.length - menuLimit} more on the Menu page.</p>
          ) : null}
        </section>
      </div>

      <RejectDialog
        order={rejecting}
        busy={busy}
        onClose={() => setRejecting(null)}
        onReject={async (order, reason) => {
          if (await onAction(order, 'reject', reason)) setRejecting(null);
        }}
      />
    </div>
  );
}

type OverviewColumnProps = {
  title: string;
  pill: string;
  orders: Order[];
  empty: string;
  note?: string;
  onMore: () => void;
  render: (order: Order) => ReactNode;
};

function OverviewColumn({ title, pill, orders, empty, note, onMore, render }: OverviewColumnProps) {
  return (
    <section className="card overview-column" aria-label={title}>
      <div className="overview-column-head">
        <h2>{title}</h2>
        <span className={`pill ${pill}`}>{orders.length}</span>
        {note ? <span className="overview-column-note">{note}</span> : null}
      </div>
      {orders.length ? (
        orders.slice(0, columnLimit).map(order => (
          <article className="overview-order" key={order.id}>
            <span className="mono overview-order-number">{orderNumber(order)}</span>
            {render(order)}
          </article>
        ))
      ) : (
        <p className="overview-empty">{empty}</p>
      )}
      {orders.length > columnLimit ? (
        <button className="text-button overview-more-button" type="button" onClick={onMore}>
          {orders.length - columnLimit} more on the order board
        </button>
      ) : null}
    </section>
  );
}

type OrdersByHourProps = {
  // Today's orders.
  orders: Order[];
  now: Date;
};

// OrdersByHour is a one-series bar chart of today's orders per hour. The current hour is
// highlighted and labelled; every bar shows its count on hover or focus, and the same numbers
// are available as a table.
function OrdersByHour({ orders, now }: OrdersByHourProps) {
  const counts = new Map<number, number>();
  orders.forEach(order => {
    const hour = new Date(order.createdAt).getHours();
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
  });
  const currentHour = now.getHours();
  // Lunch to late evening by default, stretched to cover any earlier or later orders.
  const first = Math.min(11, currentHour, ...counts.keys());
  const last = Math.max(22, currentHour, ...counts.keys());
  const hours = Array.from({ length: last - first + 1 }, (_, index) => first + index);
  const max = Math.max(1, ...counts.values());
  const label = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

  return (
    <section className="card overview-chart" aria-labelledby="overview-chart-title">
      <div className="overview-card-head">
        <h2 id="overview-chart-title">Orders by hour</h2>
        <span className="mono overview-chart-total">TODAY · {orders.length}</span>
      </div>

      <div className="hour-chart" role="list" aria-label="Orders placed each hour today">
        {hours.map(hour => {
          const count = counts.get(hour) ?? 0;
          const isNow = hour === currentHour;
          return (
            <div
              className={`hour-bar${isNow ? ' is-now' : ''}${count ? '' : ' is-empty'}`}
              key={hour}
              role="listitem"
              tabIndex={0}
              aria-label={`${label(hour)}, ${count} ${count === 1 ? 'order' : 'orders'}${isNow ? ', this hour' : ''}`}
            >
              <span className="hour-bar-tooltip mono" aria-hidden="true">
                {label(hour)} · {count}
              </span>
              <span className="hour-bar-track" aria-hidden="true">
                {isNow && count ? <span className="hour-bar-value mono">{count}</span> : null}
                {/* Up to 85% so the label above the tallest bar still fits. */}
                <span className="hour-bar-fill" style={count ? { height: `${(count / max) * 85}%` } : undefined} />
              </span>
              <span className="hour-bar-label mono" aria-hidden="true">
                {hour}
              </span>
            </div>
          );
        })}
      </div>

      <details className="hour-table">
        <summary>View as table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Hour</th>
              <th scope="col">Orders</th>
            </tr>
          </thead>
          <tbody>
            {hours.map(hour => (
              <tr key={hour}>
                <td className="mono">{label(hour)}</td>
                <td className="mono">{counts.get(hour) ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
