import { useEffect, useRef, useState, type FormEvent } from 'react';
import { logError } from '../../shared/console/outputConsole';
import { IconCheck, IconClock, IconPause, IconPlay, IconSearch } from '../icons/Icons';
import type { Order, OrderAction, Restaurant } from '../dashboard/dashboard.types';
import { formatMoney, orderTotal } from '../dashboard/dashboard.utils';
import './restaurant-orders.css';

type OrderBoardProps = {
  restaurant?: Restaurant;
  orders: Order[];
  // Ids of accepted orders in preparation order; only the first may start preparing.
  queue: string[];
  busy: string | null;
  onAction: (order: Order, action: OrderAction, reason?: string) => Promise<boolean>;
  onRefresh: () => void;
  onToggleAccepting: () => void;
};

type Tab = 'active' | 'completed' | 'stopped';
type Column = 'placed' | 'accepted' | 'preparing' | 'ready';

const columns: Array<{ status: Column; label: string; pill: string; empty: string }> = [
  { status: 'placed', label: 'Placed', pill: 'pill--primary', empty: 'No new orders.' },
  { status: 'accepted', label: 'Accepted', pill: 'pill--accent', empty: 'The preparation queue is empty.' },
  { status: 'preparing', label: 'Preparing', pill: 'pill--amber', empty: 'Nothing in the kitchen.' },
  { status: 'ready', label: 'Ready', pill: 'pill--green', empty: 'Nothing waiting for pickup.' },
];

const tabStatuses: Record<Tab, string[]> = {
  active: ['placed', 'accepted', 'preparing', 'ready'],
  completed: ['picked_up', 'delivered'],
  stopped: ['rejected', 'cancelled'],
};

const dayTimeFormat = new Intl.DateTimeFormat('en-CA', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function orderNumber(order: Order) {
  return `#${order.id.slice(0, 8)}`;
}

// Time in the current status: placed orders count from when they were placed, others from
// their last status change.
function elapsed(order: Order, now: number) {
  const since = new Date(order.status === 'placed' ? order.createdAt : (order.updatedAt ?? order.createdAt));
  const minutes = Math.max(0, Math.floor((now - since.getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

function matches(order: Order, search: string) {
  if (!search) return true;
  const number = search.replace(/^#/, '');
  return order.id.startsWith(number) || order.lines.some(line => line.name.toLowerCase().includes(search));
}

// OrderBoard is the restaurant's live order workflow: Placed -> Accepted (queue) -> Preparing
// -> Ready, with finished and rejected orders under their own tabs.
export function OrderBoard({
  restaurant,
  orders,
  queue,
  busy,
  onAction,
  onRefresh,
  onToggleAccepting,
}: OrderBoardProps) {
  const [tab, setTab] = useState<Tab>('active');
  const [query, setQuery] = useState('');
  const [rejecting, setRejecting] = useState<Order | null>(null);
  // Ticks every 30 s so the time on each card stays current.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const search = query.trim().toLowerCase();
  const counts: Record<Tab, number> = {
    active: orders.filter(order => tabStatuses.active.includes(order.status)).length,
    completed: orders.filter(order => tabStatuses.completed.includes(order.status)).length,
    stopped: orders.filter(order => tabStatuses.stopped.includes(order.status)).length,
  };
  const visible = orders.filter(order => tabStatuses[tab].includes(order.status) && matches(order, search));

  // Position in the backend's preparation queue (1 = next to prepare), whatever the search shows.
  // An order the last refresh didn't list yet counts as behind the others.
  function queuePositionOf(order: Order) {
    const index = queue.indexOf(order.id);
    return index === -1 ? queue.length + 1 : index + 1;
  }

  function columnOrders(status: Column) {
    const list = visible.filter(order => order.status === status);
    if (status === 'accepted') {
      // Queue order; anything the queue doesn't list yet goes last.
      const position = (order: Order) => (queue.includes(order.id) ? queue.indexOf(order.id) : queue.length);
      return [...list].sort((a, b) => position(a) - position(b));
    }
    // Oldest first: the order that has waited longest is the most urgent.
    return [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  const status = restaurant?.status;
  const pauseLabel = status === 'open' ? 'Pause new orders' : status === 'paused' ? 'Resume orders' : 'Open for orders';

  return (
    <div className="order-board">
      <div className="order-board-head">
        <div>
          <p className="eyebrow">{restaurant ? `${restaurant.name} · Live` : 'Live'}</p>
          <h1>Orders</h1>
        </div>
        <div className="order-board-actions">
          <label className="board-search">
            <IconSearch size={16} />
            <input
              type="search"
              aria-label="Search orders"
              placeholder="Order # or dish"
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
          </label>
          <button className="ghost-button" type="button" onClick={onRefresh} disabled={busy !== null}>
            Refresh
          </button>
          {restaurant ? (
            <button className="secondary-button" type="button" onClick={onToggleAccepting} disabled={busy !== null}>
              {status === 'open' ? <IconPause size={16} /> : <IconPlay size={16} />}
              {pauseLabel}
            </button>
          ) : null}
        </div>
      </div>

      {status && status !== 'open' ? (
        <p className="board-notice" role="status">
          {status === 'paused' ? 'New orders are paused.' : 'Your restaurant is closed.'} Orders already on the board
          still need to be finished.
        </p>
      ) : null}

      <div className="board-tabs" role="tablist" aria-label="Order lists">
        {(
          [
            ['active', 'Active'],
            ['completed', 'Completed'],
            ['stopped', 'Rejected & cancelled'],
          ] as const
        ).map(([value, label]) => (
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

      {tab === 'active' ? (
        <div className="board-columns">
          {columns.map(column => {
            const list = columnOrders(column.status);
            return (
              <section className="board-column" key={column.status} aria-label={column.label}>
                <div className="board-column-head">
                  <span className={`pill ${column.pill}`}>{column.label}</span>
                  <span className="mono">{list.length}</span>
                </div>
                {list.length ? (
                  list.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      queuePosition={column.status === 'accepted' ? queuePositionOf(order) : undefined}
                      now={now}
                      busy={busy}
                      onAction={onAction}
                      onReject={() => setRejecting(order)}
                    />
                  ))
                ) : (
                  <p className="board-column-empty">{search ? 'No matching orders.' : column.empty}</p>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <section
          className="card board-history"
          aria-label={tab === 'completed' ? 'Completed orders' : 'Stopped orders'}
        >
          {visible.length ? (
            [...visible]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map(order => <HistoryRow key={order.id} order={order} />)
          ) : (
            <p className="board-column-empty">
              {search
                ? 'No matching orders.'
                : tab === 'completed'
                  ? 'Orders show up here once a courier picks them up.'
                  : 'No rejected or cancelled orders.'}
            </p>
          )}
        </section>
      )}

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

type OrderCardProps = {
  order: Order;
  // Place in the preparation queue, for accepted orders.
  queuePosition?: number;
  now: number;
  busy: string | null;
  onAction: (order: Order, action: OrderAction) => Promise<boolean>;
  onReject: () => void;
};

function OrderCard({ order, queuePosition, now, busy, onAction, onReject }: OrderCardProps) {
  const disabled = busy !== null;

  return (
    <article className="board-card">
      <div className="board-card-head">
        <span className="mono board-card-number">{orderNumber(order)}</span>
        <span className="mono board-card-time" title="Time in this status">
          <IconClock size={13} />
          {elapsed(order, now)}
        </span>
      </div>

      <div className="board-card-lines">
        {order.lines.map(line => (
          <div className="board-card-line" key={line.id}>
            <span className="mono">{line.quantity}×</span>
            <span>{line.name}</span>
            <span className="mono">{formatMoney(line.unitPrice * line.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="board-card-foot">
        <span className="mono board-card-total">{formatMoney(orderTotal(order))}</span>
        {order.status === 'placed' ? (
          <div className="board-card-actions">
            <button className="ghost-button" type="button" disabled={disabled} onClick={onReject}>
              Reject
            </button>
            <button
              className="primary-button small"
              type="button"
              disabled={disabled}
              onClick={() => void onAction(order, 'accept')}
            >
              Accept
            </button>
          </div>
        ) : null}
        {order.status === 'accepted' && queuePosition === 1 ? (
          <button
            className="small-button"
            type="button"
            disabled={disabled}
            onClick={() => void onAction(order, 'prepare')}
          >
            Start preparing
          </button>
        ) : null}
        {order.status === 'accepted' && queuePosition !== undefined && queuePosition > 1 ? (
          <span className="board-card-note" title="Orders are prepared in the order they were accepted.">
            In queue · #{queuePosition}
          </span>
        ) : null}
        {order.status === 'preparing' ? (
          <button
            className="primary-button small"
            type="button"
            disabled={disabled}
            onClick={() => void onAction(order, 'ready')}
          >
            <IconCheck size={15} />
            Mark ready
          </button>
        ) : null}
        {order.status === 'ready' ? <span className="board-card-note">Waiting for pickup</span> : null}
      </div>
    </article>
  );
}

function HistoryRow({ order }: { order: Order }) {
  const items = order.lines.map(line => (line.quantity > 1 ? `${line.quantity}× ${line.name}` : line.name)).join(' · ');
  const uncharged = order.status === 'rejected' || order.status === 'cancelled';

  return (
    <div className="board-history-row">
      <span className="mono board-card-number">{orderNumber(order)}</span>
      <div className="board-history-main">
        <span title={items}>{items}</span>
        {order.rejectionReason ? <small>Reason: {order.rejectionReason}</small> : null}
      </div>
      <span className="mono board-history-date">{dayTimeFormat.format(new Date(order.createdAt))}</span>
      <span className={`order-status status-pill-${order.status}`}>{order.status.replace('_', ' ')}</span>
      <span className={`mono board-history-total${uncharged ? ' is-uncharged' : ''}`}>
        {uncharged ? 'Not charged' : formatMoney(orderTotal(order))}
      </span>
    </div>
  );
}

type RejectDialogProps = {
  order: Order | null;
  busy: string | null;
  onClose: () => void;
  onReject: (order: Order, reason: string) => Promise<void>;
};

// RejectDialog asks why an order is rejected; the customer sees the reason on their order.
// Limits mirror the backend's OrderRejectionRequest (3 to 500 characters).
function RejectDialog({ order, busy, onClose, onReject }: RejectDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (order && !dialog.open) dialog.showModal();
    if (!order && dialog.open) dialog.close();
  }, [order]);

  function close() {
    setReason('');
    setError(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;
    const trimmed = reason.trim();
    if (trimmed.length < 3 || trimmed.length > 500) {
      const message = 'Give a reason between 3 and 500 characters.';
      setError(message);
      logError('RejectOrderCommand', message);
      return;
    }
    await onReject(order, trimmed);
    setReason('');
    setError(null);
  }

  return (
    <dialog
      ref={dialogRef}
      className="reject-dialog"
      aria-labelledby="reject-dialog-title"
      onCancel={event => {
        event.preventDefault();
        close();
      }}
    >
      <form className="reject-dialog-content" onSubmit={handleSubmit} noValidate>
        <h2 id="reject-dialog-title">Reject {order ? orderNumber(order) : 'order'}?</h2>
        <p>The customer sees this reason on their order. Rejected orders aren’t charged.</p>
        <div className="field-group">
          <label htmlFor="reject-reason">Reason</label>
          <textarea
            id="reject-reason"
            rows={3}
            value={reason}
            onChange={event => setReason(event.target.value)}
            placeholder="e.g. We’re out of an ingredient for this dish."
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'reject-reason-error' : undefined}
          />
          {error ? (
            <p className="field-error" id="reject-reason-error">
              {error}
            </p>
          ) : null}
        </div>
        <div className="reject-dialog-actions">
          <button className="secondary-button" type="button" onClick={close}>
            Keep order
          </button>
          <button className="danger-button" type="submit" disabled={busy !== null}>
            Reject order
          </button>
        </div>
      </form>
    </dialog>
  );
}
