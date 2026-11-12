import type { Order, Restaurant, StoredEvent } from '../dashboard/dashboard.types';
import { chargedTotal, formatMoney } from '../dashboard/dashboard.utils';
import { IconClose } from '../icons/Icons';
import { orderNumber } from '../restaurant/orderTime';

type OrderPanelProps = {
  order: Order;
  restaurants: Restaurant[];
  // The order's events, oldest first; undefined while they load, null if they could not be.
  events: StoredEvent[] | null | undefined;
  busy: string | null;
  onClose: () => void;
  onCancel: (order: Order) => void;
};

// Orders that reached one of these can't change any more, so they can't be cancelled.
const finalStatuses = ['delivered', 'rejected', 'cancelled', 'refunded'];

const dateTimeFormat = new Intl.DateTimeFormat('en-CA', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const timeFormat = new Intl.DateTimeFormat('en-CA', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function statusLabel(status: string) {
  const text = status.replace('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// What the event did, e.g. "Placed", "Accepted", "Rejected".
function eventTitle(event: StoredEvent) {
  if (event.eventType === 'order.placed') return 'Placed';
  if (event.eventType === 'order.summary_created') return 'Summary created';
  const next = event.payload.newStatus;
  return typeof next === 'string' ? statusLabel(next) : event.eventType;
}

// Who did it: the customer and restaurant by name, operators by role.
function eventActor(event: StoredEvent, order: Order, restaurants: Restaurant[]) {
  const { actor } = event;
  if (!actor) return 'System';
  if (actor.role === 'customer') return actor.id === order.customerId ? order.customerName : 'A customer';
  if (actor.role === 'restaurant') {
    return restaurants.find(restaurant => restaurant.ownerId === actor.id)?.name ?? 'The restaurant';
  }
  if (actor.role === 'operator') return 'An operator';
  return statusLabel(actor.role);
}

// OrderPanel shows one order to the operator: what was ordered and where it goes, every state
// change recorded for it with its event id (R-ORD-05), and a way to cancel it.
export function OrderPanel({ order, restaurants, events, busy, onClose, onCancel }: OrderPanelProps) {
  const restaurant = restaurants.find(item => item.id === order.restaurantId);
  const address = order.deliveryAddress;
  const cancellable = !finalStatuses.includes(order.status);
  const ledger = order.billing?.ledger;

  return (
    <aside className="card operator-order-panel" aria-labelledby="operator-order-title">
      <div className="operator-panel-head">
        <div>
          <h2 id="operator-order-title" className="mono">
            {orderNumber(order)}
          </h2>
          <span className={`order-status status-pill-${order.status}`}>{order.status.replace('_', ' ')}</span>
        </div>
        <button className="ghost-button icon-button" type="button" aria-label="Close order" onClick={onClose}>
          <IconClose size={18} />
        </button>
      </div>

      <dl className="operator-facts">
        <div>
          <dt>Customer</dt>
          <dd>{order.customerName}</dd>
        </div>
        <div>
          <dt>Restaurant</dt>
          <dd>{restaurant?.name ?? 'Unknown restaurant'}</dd>
        </div>
        <div>
          <dt>Placed</dt>
          <dd>{dateTimeFormat.format(new Date(order.createdAt))}</dd>
        </div>
        {ledger ? (
          <div>
            <dt>Delivered</dt>
            <dd>{dateTimeFormat.format(new Date(ledger.deliveredAt))}</dd>
          </div>
        ) : null}
        {ledger?.refund ? (
          <div>
            <dt>Refunded</dt>
            <dd>
              {dateTimeFormat.format(new Date(ledger.refund.refundedAt))} · {formatMoney(ledger.refund.amount)}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Deliver to</dt>
          <dd>{address ? `${address.street}, ${address.city} ${address.postalCode}` : 'No address recorded'}</dd>
        </div>
      </dl>

      {order.rejectionReason ? (
        <p className="operator-reason">
          <strong>Rejection reason</strong>
          {order.rejectionReason}
        </p>
      ) : null}

      <section className="operator-panel-section" aria-labelledby="operator-order-items">
        <h3 id="operator-order-items">Items</h3>
        <ul className="operator-lines">
          {order.lines.map(line => (
            <li key={line.id}>
              <span className="mono">{line.quantity}×</span>
              <span>{line.name}</span>
              <span className="mono">{formatMoney(line.unitPrice * line.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="operator-lines-total">
          <span>{ledger ? 'Total charged' : 'Total'}</span>
          <span className="mono">{formatMoney(chargedTotal(order))}</span>
        </div>
      </section>

      <section className="operator-panel-section" aria-labelledby="operator-order-events">
        <h3 id="operator-order-events">Event history</h3>
        {events === undefined ? (
          <p className="overview-empty">Loading events…</p>
        ) : events === null ? (
          <p className="overview-empty">The event history could not be loaded.</p>
        ) : events.length ? (
          <ol className="operator-events">
            {events.map(event => (
              <li key={event.id}>
                <span className="operator-event-dot" aria-hidden="true" />
                <div>
                  <div className="operator-event-head">
                    <strong>{eventTitle(event)}</strong>
                    <span className="mono">{timeFormat.format(new Date(event.occurredAt))}</span>
                  </div>
                  <span className="operator-event-actor">
                    by {eventActor(event, order, restaurants)}
                    {typeof event.payload.reason === 'string' ? ` · “${event.payload.reason}”` : ''}
                  </span>
                  <span className="operator-event-id mono" title="Event id">
                    {event.id}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="overview-empty">No events recorded for this order.</p>
        )}
      </section>

      {cancellable ? (
        <button
          className="danger-button operator-cancel"
          type="button"
          disabled={busy !== null}
          onClick={() => onCancel(order)}
        >
          Cancel order
        </button>
      ) : null}
    </aside>
  );
}
