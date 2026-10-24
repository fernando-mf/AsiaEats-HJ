import type { Order, OrderAction, Restaurant } from '../dashboard/dashboard.types';
import { formatMoney, orderTotal } from '../dashboard/dashboard.utils';

type RestaurantOrdersProps = {
  orders: Order[];
  restaurants: Restaurant[];
  busy: string | null;
  onAction: (order: Order, action: OrderAction) => Promise<void>;
  onRefresh: () => void;
};

export function RestaurantOrders({ orders, restaurants, busy, onAction, onRefresh }: RestaurantOrdersProps) {
  return (
    <section className="panel storefront-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">ORDER WORKFLOW</p>
          <h2>Incoming orders</h2>
          <p className="muted">Accept orders, start preparing them, and mark them ready.</p>
        </div>
        <button className="secondary-button" onClick={onRefresh} disabled={busy !== null}>
          Refresh orders
        </button>
      </div>
      <div className="lifecycle">
        <span>Placed</span>
        <i>→</i>
        <span>Accepted</span>
        <i>→</i>
        <span>Preparing</span>
        <i>→</i>
        <span>Ready</span>
      </div>
      {orders.length ? (
        <div className="order-list">
          {orders.map(order => (
            <article className="order-card order-card-large" key={order.id}>
              <div className="order-details">
                <div className="order-title">
                  <strong>Order #{order.id.slice(0, 8)}</strong>
                  <span className={`order-status status-pill-${order.status}`}>{order.status.replace('_', ' ')}</span>
                </div>
                <span>{restaurants.find(restaurant => restaurant.id === order.restaurantId)?.name}</span>
                <span>{order.lines.map(line => `${line.name} × ${line.quantity}`).join(', ')}</span>
                <b>{formatMoney(orderTotal(order))}</b>
                {order.rejectionReason ? <small>Reason: {order.rejectionReason}</small> : null}
              </div>
              <div className="order-controls">
                {order.status === 'placed' ? (
                  <>
                    <button
                      className="primary-button small"
                      disabled={busy !== null}
                      onClick={() => void onAction(order, 'accept')}
                    >
                      Accept
                    </button>
                    <button
                      className="danger-button"
                      disabled={busy !== null}
                      onClick={() => void onAction(order, 'reject')}
                    >
                      Reject
                    </button>
                  </>
                ) : null}
                {order.status === 'accepted' ? (
                  <button
                    className="primary-button small"
                    disabled={busy !== null}
                    onClick={() => void onAction(order, 'prepare')}
                  >
                    Start preparing
                  </button>
                ) : null}
                {order.status === 'preparing' ? (
                  <button
                    className="primary-button small"
                    disabled={busy !== null}
                    onClick={() => void onAction(order, 'ready')}
                  >
                    Mark ready
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty">No incoming orders yet. A customer order will appear here.</p>
      )}
    </section>
  );
}
