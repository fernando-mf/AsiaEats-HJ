import { useState } from 'react';
import { DishArt } from '../food/DishArt';
import { dishKind } from '../food/dishKind';
import { IconCheck, IconChevronRight, IconClock, IconPin, IconSearch } from '../icons/Icons';
import type { Address, Order, Restaurant } from '../dashboard/dashboard.types';
import { formatMoney, orderTotal } from '../dashboard/dashboard.utils';
import './orders.css';

type OrdersPageProps = {
  orders: Order[];
  restaurants: Restaurant[];
  address: Address | null | undefined;
  busy: string | null;
  onRefreshOrders: () => void;
  onFindRestaurants: () => void;
  onOpenRestaurant: (restaurantId: string) => void;
  onCancelOrder: (order: Order) => void;
};

type CancelProps = {
  busy: string | null;
  onCancel: (order: Order) => void;
};

// Customers may cancel only while the order is still placed (Appendix A, R-ORD-04).
const NOT_CANCELLABLE = 'The restaurant has accepted this order, so it can no longer be cancelled.';

function CancelButton({ order, busy, onCancel }: CancelProps & { order: Order }) {
  const cancellable = order.status === 'placed';

  return (
    <button
      className="secondary-button cancel-button"
      type="button"
      disabled={!cancellable || busy !== null}
      title={cancellable ? undefined : NOT_CANCELLABLE}
      onClick={() => onCancel(order)}
    >
      Cancel order
    </button>
  );
}

type PastFilter = 'all' | 'delivered' | 'cancelled' | 'rejected';

const steps = ['placed', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered'] as const;
const activeStatuses = ['placed', 'accepted', 'preparing', 'ready', 'picked_up'];
const unchargedStatuses = ['cancelled', 'rejected'];

const statusMessages: Record<string, string> = {
  placed: 'Waiting for the restaurant to accept',
  accepted: 'Accepted · in the preparation queue',
  preparing: 'The kitchen is preparing your order',
  ready: 'Ready for pickup',
  picked_up: 'On its way',
};

const timeFormat = new Intl.DateTimeFormat('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false });
const dayFormat = new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' });
const monthFormat = new Intl.DateTimeFormat('en-CA', { month: 'long' });

function label(status: string) {
  return status.replace('_', ' ');
}

function itemCount(order: Order) {
  const count = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  return `${count} ${count === 1 ? 'item' : 'items'}`;
}

function itemSummary(order: Order) {
  return order.lines.map(line => (line.quantity > 1 ? `${line.quantity}× ${line.name}` : line.name)).join(' · ');
}

function StatusPill({ status }: { status: string }) {
  return <span className={`order-status status-pill-${status}`}>{label(status)}</span>;
}

function OrderThumb({ order, large = false }: { order: Order; large?: boolean }) {
  return (
    <DishArt
      kind={dishKind(order.lines[0]?.name ?? '')}
      className={`order-thumb${large ? ' order-thumb--lg' : ''}`}
      iconSize={large ? 26 : 20}
    />
  );
}

function OrderSteps({ order }: { order: Order }) {
  const current = steps.indexOf(order.status as (typeof steps)[number]);

  return (
    <ol className="order-steps">
      {steps.map((step, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'todo';
        const time =
          index === 0
            ? timeFormat.format(new Date(order.createdAt))
            : index === current && order.updatedAt
              ? `since ${timeFormat.format(new Date(order.updatedAt))}`
              : '';

        return (
          <li className={`order-step order-step--${state}`} key={step}>
            <span className="order-step-marker" aria-hidden="true">
              {state === 'done' ? <IconCheck size={14} /> : null}
            </span>
            <span className="order-step-label">{label(step)}</span>
            <span className="order-step-time mono">{time}</span>
          </li>
        );
      })}
    </ol>
  );
}

function LiveOrder({
  order,
  restaurantName,
  address,
  busy,
  onCancel,
}: CancelProps & { order: Order; restaurantName: string; address: Address | null | undefined }) {
  return (
    <article className="card order-live">
      <div className="order-live-head">
        <OrderThumb order={order} large />
        <div className="order-live-title">
          <div>
            <h3>{restaurantName}</h3>
            <StatusPill status={order.status} />
          </div>
          <span className="mono">
            #{order.id.slice(0, 8)} · {itemCount(order)} · placed {timeFormat.format(new Date(order.createdAt))}
          </span>
        </div>
        <div className="order-live-total">
          <span>Total</span>
          <strong className="mono">{formatMoney(orderTotal(order))}</strong>
        </div>
      </div>

      <OrderSteps order={order} />

      <div className="order-live-body">
        <div className="order-lines">
          {order.lines.map(line => (
            <div className="order-line" key={line.id}>
              <span className="mono">{line.quantity}×</span>
              <span>{line.name}</span>
              <span className="mono">{formatMoney(line.unitPrice * line.quantity)}</span>
            </div>
          ))}
          <div className="order-lines-total">
            <span>Total</span>
            <span className="mono">{formatMoney(orderTotal(order))}</span>
          </div>
        </div>

        <div className="order-live-info">
          {address ? (
            <div className="order-info-row">
              <IconPin size={17} />
              <div>
                <strong>{address.street}</strong>
                <span>
                  {address.city}, {address.postalCode}
                </span>
              </div>
            </div>
          ) : null}
          <div className="order-info-row">
            <IconClock size={17} />
            <div>
              <strong>{statusMessages[order.status] ?? label(order.status)}</strong>
              {order.updatedAt ? <span>Last update {timeFormat.format(new Date(order.updatedAt))}</span> : null}
            </div>
          </div>
          <div className="order-live-actions">
            <CancelButton order={order} busy={busy} onCancel={onCancel} />
            {order.status !== 'placed' ? <span className="order-cancel-note">{NOT_CANCELLABLE}</span> : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function CompactOrder({
  order,
  restaurantName,
  busy,
  onCancel,
}: CancelProps & { order: Order; restaurantName: string }) {
  return (
    <article className="card order-compact">
      <OrderThumb order={order} />
      <div className="order-compact-main">
        <div>
          <strong>{restaurantName}</strong>
          <StatusPill status={order.status} />
        </div>
        <span>
          {itemSummary(order)}{' '}
          <span className="mono">
            · #{order.id.slice(0, 8)} · placed {timeFormat.format(new Date(order.createdAt))}
          </span>
        </span>
      </div>
      <span className="order-compact-note">{statusMessages[order.status] ?? ''}</span>
      <span className="mono order-compact-total">{formatMoney(orderTotal(order))}</span>
      <CancelButton order={order} busy={busy} onCancel={onCancel} />
    </article>
  );
}

function PastOrderRow({ order, restaurantName }: { order: Order; restaurantName: string }) {
  const uncharged = unchargedStatuses.includes(order.status);
  const summary = order.rejectionReason
    ? `${itemSummary(order)} · rejected: ${order.rejectionReason}`
    : itemSummary(order);

  return (
    <div className="past-order">
      <OrderThumb order={order} />
      <div className="past-order-main">
        <strong>{restaurantName}</strong>
        <span title={summary}>{summary}</span>
      </div>
      <span className="mono past-order-date">{dayFormat.format(new Date(order.createdAt))}</span>
      <span>
        <StatusPill status={order.status} />
      </span>
      <span className={`mono past-order-total${uncharged ? ' is-uncharged' : ''}`}>
        {uncharged ? 'Not charged' : formatMoney(orderTotal(order))}
      </span>
    </div>
  );
}

export function OrdersPage({
  orders,
  restaurants,
  address,
  busy,
  onRefreshOrders,
  onFindRestaurants,
  onOpenRestaurant,
  onCancelOrder,
}: OrdersPageProps) {
  const [filter, setFilter] = useState<PastFilter>('all');
  // Taken once on mount: used to pick out this month's orders.
  const [now] = useState(() => new Date());
  const restaurantName = (id: string) => restaurants.find(restaurant => restaurant.id === id)?.name ?? 'Restaurant';

  const active = orders.filter(order => activeStatuses.includes(order.status));
  const past = orders.filter(order => !activeStatuses.includes(order.status));
  const visiblePast = filter === 'all' ? past : past.filter(order => order.status === filter);
  const [featured, ...otherActive] = active;

  const thisMonth = orders.filter(order => {
    const created = new Date(order.createdAt);
    return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
  });
  const monthOrdered = thisMonth
    .filter(order => !unchargedStatuses.includes(order.status))
    .reduce((sum, order) => sum + orderTotal(order), 0);
  const monthUncharged = thisMonth.filter(order => unchargedStatuses.includes(order.status)).length;

  const orderCounts = new Map<string, number>();
  orders.forEach(order => orderCounts.set(order.restaurantId, (orderCounts.get(order.restaurantId) ?? 0) + 1));
  const orderAgain = [...orderCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="orders-page">
      <div className="orders-page-head">
        <div>
          <p className="eyebrow">Your orders</p>
          <h1>Orders</h1>
        </div>
        <div className="orders-page-actions">
          <button className="ghost-button" onClick={onRefreshOrders} disabled={busy !== null}>
            Refresh
          </button>
          <button className="secondary-button" onClick={onFindRestaurants}>
            <IconSearch size={16} />
            Find something new
          </button>
        </div>
      </div>

      {featured ? (
        <section className="orders-section">
          <div className="orders-section-head">
            <h2>In progress</h2>
            <span className="mono">{active.length}</span>
          </div>
          <LiveOrder
            order={featured}
            restaurantName={restaurantName(featured.restaurantId)}
            address={address}
            busy={busy}
            onCancel={onCancelOrder}
          />
          {otherActive.map(order => (
            <CompactOrder
              key={order.id}
              order={order}
              restaurantName={restaurantName(order.restaurantId)}
              busy={busy}
              onCancel={onCancelOrder}
            />
          ))}
        </section>
      ) : null}

      <div className="orders-grid">
        <section className="card past-orders">
          <div className="past-orders-head">
            <h2>Past orders</h2>
            <div className="segmented" role="group" aria-label="Filter past orders">
              {(['all', 'delivered', 'cancelled', 'rejected'] as const).map(option => (
                <button key={option} type="button" aria-pressed={filter === option} onClick={() => setFilter(option)}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {visiblePast.length ? (
            visiblePast.map(order => (
              <PastOrderRow key={order.id} order={order} restaurantName={restaurantName(order.restaurantId)} />
            ))
          ) : (
            <p className="past-orders-empty">
              {past.length ? 'No past orders with this status.' : 'No past orders yet. Finished orders show up here.'}
            </p>
          )}
        </section>

        <aside className="orders-aside">
          <section className="card orders-summary">
            <div className="orders-summary-head">
              <h2>{monthFormat.format(now)}</h2>
              <span className="mono">
                {thisMonth.length} {thisMonth.length === 1 ? 'ORDER' : 'ORDERS'}
              </span>
            </div>
            <div className="orders-summary-row">
              <span>Ordered</span>
              <span className="mono">{formatMoney(monthOrdered)}</span>
            </div>
            <div className="orders-summary-row">
              <span>Cancelled or rejected</span>
              <span className="mono">
                {monthUncharged} {monthUncharged === 1 ? 'order' : 'orders'}
              </span>
            </div>
          </section>

          {orderAgain.length ? (
            <section className="card order-again">
              <h2>Order again</h2>
              {orderAgain.map(([restaurantId, count]) => (
                <button className="order-again-row" key={restaurantId} onClick={() => onOpenRestaurant(restaurantId)}>
                  <span className="order-again-initial">{restaurantName(restaurantId).charAt(0)}</span>
                  <span className="order-again-name">
                    <strong>{restaurantName(restaurantId)}</strong>
                    <span>
                      {count} {count === 1 ? 'order' : 'orders'}
                    </span>
                  </span>
                  <IconChevronRight size={15} />
                </button>
              ))}
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
