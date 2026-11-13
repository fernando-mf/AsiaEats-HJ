import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiErrorMessage, requestJson } from '../shared/api/client';
import type { Order } from './dashboard/dashboard.types';
import { orderNumber, timeInStatus, useNow } from './restaurant/orderTime';
import './operator-delivery.css';

type AssignmentStatus = 'queued' | 'offered' | 'accepted' | 'stalled' | 'delivered';

type OrderAssignment = {
  id: string;
  orderId: string;
  courierId: string | null;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
};

type OperatorDeliveryMonitorProps = {
  orders: Order[];
  busy: string | null;
};

const refreshInterval = 15_000;
const dateTimeFormat = new Intl.DateTimeFormat('en-CA', {
  hour: '2-digit',
  minute: '2-digit',
});

function AssignmentEmpty({ children }: { children: string }) {
  return <p className="operator-delivery-empty">{children}</p>;
}

function AssignmentOrder({ order }: { order: Order | undefined }) {
  if (!order) return <span className="operator-delivery-muted">Order details unavailable</span>;
  return (
    <span className="operator-delivery-order">
      <strong>{orderNumber(order)}</strong>
      <span>
        {order.customerName} · {order.lines.reduce((total, line) => total + line.quantity, 0)} items
      </span>
    </span>
  );
}

function AssignmentStatusLabel({ status }: { status: AssignmentStatus }) {
  return <span className={`operator-assignment-status is-${status}`}>{status.replace('_', ' ')}</span>;
}

// The operator's DLV monitor: active courier offers, stalled assignments and orders waiting
// in the dispatch queue. The API is the source of truth; this component only displays/actions it.
export function OperatorDeliveryMonitor({ orders, busy }: OperatorDeliveryMonitorProps) {
  const [active, setActive] = useState<OrderAssignment[]>([]);
  const [stalled, setStalled] = useState<OrderAssignment[]>([]);
  const [queued, setQueued] = useState<OrderAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const now = useNow();
  const orderById = useMemo(() => new Map(orders.map(order => [order.id, order])), [orders]);

  const refresh = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    try {
      const [offered, accepted, stalledAssignments, queuedAssignments] = await Promise.all([
        requestJson<OrderAssignment[]>('/order-assignments?status=offered'),
        requestJson<OrderAssignment[]>('/order-assignments?status=accepted'),
        requestJson<OrderAssignment[]>('/order-assignments?status=stalled'),
        requestJson<OrderAssignment[]>('/order-assignments?status=queued'),
      ]);
      setActive([...offered, ...accepted].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      setStalled(stalledAssignments);
      setQueued(queuedAssignments);
      setError(null);
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh(true);
    const timer = window.setInterval(() => void refresh(), refreshInterval);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function reassign(assignment: OrderAssignment) {
    setReassigningId(assignment.id);
    setError(null);
    try {
      await requestJson<OrderAssignment>(`/order-assignments/${assignment.id}/reassign`, { method: 'POST' });
      await refresh();
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setReassigningId(null);
    }
  }

  return (
    <section className="operator-delivery-monitor" aria-label="Courier delivery monitoring">
      <div className="operator-delivery-heading">
        <div>
          <p className="eyebrow">DLV · COURIER OPERATIONS</p>
          <h2>Delivery assignments</h2>
          <p className="operator-delivery-subtitle">Monitor dispatch, courier offers and stalled deliveries.</p>
        </div>
        <button
          className="secondary-button"
          type="button"
          disabled={refreshing || busy !== null}
          onClick={() => void refresh()}
        >
          {refreshing ? 'Refreshing…' : 'Refresh assignments'}
        </button>
      </div>

      {error ? (
        <p className="operator-delivery-error" role="alert">
          {error}
        </p>
      ) : null}

      <section
        className={`operator-delivery-queue ${queued.length ? 'has-queued' : ''}`}
        aria-labelledby="dispatch-queue-title"
      >
        <div className="operator-delivery-section-heading">
          <div>
            <h3 id="dispatch-queue-title">Dispatch queue</h3>
            <p>Ready orders waiting for an idle courier.</p>
          </div>
          <span className="operator-delivery-count" aria-label={`${queued.length} queued orders`}>
            {queued.length}
          </span>
        </div>
        {loading ? (
          <AssignmentEmpty>Loading dispatch queue…</AssignmentEmpty>
        ) : queued.length ? (
          <ul className="operator-delivery-queue-list" role="status">
            {queued.map(assignment => {
              const order = orderById.get(assignment.orderId);
              return (
                <li key={assignment.id}>
                  <span className="operator-delivery-queue-indicator" aria-hidden="true" />
                  <AssignmentOrder order={order} />
                  <span className="operator-delivery-queue-time">
                    Waiting since {dateTimeFormat.format(new Date(assignment.createdAt))}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <AssignmentEmpty>No orders are waiting for courier assignment.</AssignmentEmpty>
        )}
      </section>

      <div className="operator-delivery-columns">
        <section className="card operator-delivery-card" aria-labelledby="active-assignments-title">
          <div className="operator-delivery-section-heading">
            <div>
              <h3 id="active-assignments-title">Active assignments</h3>
              <p>Orders offered to or accepted by couriers.</p>
            </div>
            <span className="operator-delivery-count">{active.length}</span>
          </div>
          {loading ? (
            <AssignmentEmpty>Loading assignments…</AssignmentEmpty>
          ) : active.length ? (
            <div className="operator-delivery-table-wrap">
              <table className="operator-delivery-table">
                <thead>
                  <tr>
                    <th scope="col">Order</th>
                    <th scope="col">Courier ID</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {active.map(assignment => (
                    <tr key={assignment.id}>
                      <td>
                        <AssignmentOrder order={orderById.get(assignment.orderId)} />
                      </td>
                      <td className="operator-delivery-id">{assignment.courierId ?? '—'}</td>
                      <td>
                        <AssignmentStatusLabel status={assignment.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <AssignmentEmpty>No active courier assignments.</AssignmentEmpty>
          )}
        </section>

        <section className="card operator-delivery-card" aria-labelledby="stalled-orders-title">
          <div className="operator-delivery-section-heading">
            <div>
              <h3 id="stalled-orders-title">Stalled orders</h3>
              <p>Reassignment requires an operator command.</p>
            </div>
            <span className="operator-delivery-count is-warning">{stalled.length}</span>
          </div>
          {loading ? (
            <AssignmentEmpty>Loading stalled orders…</AssignmentEmpty>
          ) : stalled.length ? (
            <ul className="operator-delivery-stalled-list">
              {stalled.map(assignment => {
                const order = orderById.get(assignment.orderId);
                const isReassigning = reassigningId === assignment.id;
                return (
                  <li key={assignment.id}>
                    <div className="operator-delivery-stalled-info">
                      <AssignmentOrder order={order} />
                      <span className="operator-delivery-muted">
                        Stalled{' '}
                        {timeInStatus(
                          {
                            id: assignment.orderId,
                            customerId: order?.customerId ?? '',
                            customerName: order?.customerName ?? 'Customer',
                            restaurantId: order?.restaurantId ?? '',
                            status: 'stalled',
                            lines: order?.lines ?? [],
                            createdAt: assignment.createdAt,
                            updatedAt: assignment.updatedAt,
                          },
                          now,
                        )}
                      </span>
                    </div>
                    <button
                      className="soft-button operator-delivery-reassign"
                      type="button"
                      disabled={busy !== null || reassigningId !== null}
                      onClick={() => void reassign(assignment)}
                    >
                      {isReassigning ? 'Reassigning…' : 'Reassign'}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <AssignmentEmpty>No stalled orders need attention.</AssignmentEmpty>
          )}
        </section>
      </div>
    </section>
  );
}
