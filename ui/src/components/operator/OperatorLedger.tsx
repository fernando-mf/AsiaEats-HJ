import type { LedgerEntry, Order, Restaurant } from '../dashboard/dashboard.types';
import { formatMoney } from '../dashboard/dashboard.utils';
import '../restaurant/restaurant-overview.css';

type OperatorLedgerProps = {
  // Undefined while it loads, null if it could not be loaded.
  entries: LedgerEntry[] | null | undefined;
  orders: Order[];
  restaurants: Restaurant[];
  updatedAt: Date | undefined;
  busy: string | null;
  onRefresh: () => void;
  onOpenOrder: (orderId: string) => void;
};

const dateTimeFormat = new Intl.DateTimeFormat('en-CA', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const timeFormat = new Intl.DateTimeFormat('en-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// A refund's amounts are stored negative; they are shown as "−$3.00".
function money(amount: number) {
  return amount < 0 ? `−${formatMoney(-amount)}` : formatMoney(amount);
}

// OperatorLedger lists every ledger entry, newest recorded first, so the operator can audit what each order
// was charged and refunded (R-PRC-03, R-PRC-05). Each entry carries its fare's parts, so the total
// can be checked by hand.
export function OperatorLedger({
  entries,
  orders,
  restaurants,
  updatedAt,
  busy,
  onRefresh,
  onOpenOrder,
}: OperatorLedgerProps) {
  const customerName = (entry: LedgerEntry) =>
    orders.find(order => order.id === entry.orderId)?.customerName ?? 'Customer';
  const restaurantName = (id: string) => restaurants.find(restaurant => restaurant.id === id)?.name ?? 'Restaurant';

  const charged = (entries ?? []).filter(entry => entry.kind === 'charge').reduce((sum, e) => sum + e.total, 0);
  const refunded = (entries ?? []).filter(entry => entry.kind === 'refund').reduce((sum, e) => sum - e.total, 0);

  return (
    <div className="overview">
      <div className="overview-head">
        <div>
          <p className="eyebrow">
            {updatedAt ? <span className="mono">Updated {timeFormat.format(updatedAt)}</span> : 'Loading…'}
          </p>
          <h1>Ledger</h1>
        </div>
        <div className="overview-actions">
          <button className="secondary-button" type="button" disabled={busy !== null} onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </div>

      <section className="card operator-card" aria-label="Ledger entries">
        {entries === undefined ? (
          <p className="overview-empty">Loading the ledger…</p>
        ) : entries === null ? (
          <p className="overview-empty">The ledger could not be loaded. Try Refresh.</p>
        ) : entries.length ? (
          <>
            <p className="operator-card-note">
              <span className="mono">{entries.length}</span> {entries.length === 1 ? 'entry' : 'entries'} · charged{' '}
              <span className="mono">{formatMoney(charged)}</span> · refunded{' '}
              <span className="mono">{formatMoney(refunded)}</span> · net{' '}
              <span className="mono">{formatMoney(charged - refunded)}</span>
            </p>
            <div className="operator-table-wrap">
              <table className="operator-table operator-ledger-table">
                <thead>
                  <tr>
                    <th scope="col">Order</th>
                    <th scope="col">Entry</th>
                    <th scope="col">Final state</th>
                    <th scope="col">Customer · restaurant</th>
                    <th scope="col">Placed · closed</th>
                    <th scope="col" className="is-number">
                      Subtotal
                    </th>
                    <th scope="col" className="is-number">
                      Delivery
                    </th>
                    <th scope="col" className="is-number">
                      Service
                    </th>
                    <th scope="col" className="is-number">
                      Surcharge
                    </th>
                    <th scope="col" className="is-number">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => (
                    <tr key={entry.id} className={entry.kind === 'refund' ? 'is-refund' : undefined}>
                      <th scope="row">
                        <button
                          className="operator-order-link mono"
                          type="button"
                          title="Open this order"
                          onClick={() => onOpenOrder(entry.orderId)}
                        >
                          #{entry.orderId.slice(0, 8)}
                        </button>
                      </th>
                      <td>
                        <span className={`pill ${entry.kind === 'refund' ? 'pill--amber' : 'pill--neutral'}`}>
                          {entry.kind}
                        </span>
                      </td>
                      <td>
                        <span className={`order-status status-pill-${entry.orderStatus}`}>
                          {entry.orderStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span className="operator-ledger-who">
                          {customerName(entry)}
                          <small>{restaurantName(entry.restaurantId)}</small>
                        </span>
                      </td>
                      <td>
                        <span className="operator-ledger-who">
                          <span className="operator-muted">{dateTimeFormat.format(new Date(entry.orderPlacedAt))}</span>
                          <small>{dateTimeFormat.format(new Date(entry.orderClosedAt))}</small>
                        </span>
                      </td>
                      <td className="is-number mono">{money(entry.subtotal)}</td>
                      <td className="is-number mono">{money(entry.deliveryFee)}</td>
                      <td className="is-number mono">{money(entry.serviceFee)}</td>
                      <td className="is-number mono">{money(entry.smallOrderSurcharge)}</td>
                      <td className="is-number mono operator-ledger-total">{money(entry.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="overview-empty">
            No entries yet. Orders are recorded here once they are delivered, rejected or cancelled.
          </p>
        )}
      </section>
    </div>
  );
}
