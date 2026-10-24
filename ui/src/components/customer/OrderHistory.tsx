import type { Order, Restaurant } from '../dashboard/dashboard.types';
import { formatMoney, orderTotal } from '../dashboard/dashboard.utils';

export function OrderHistory({ orders, restaurants }: { orders: Order[]; restaurants: Restaurant[] }) {
  if (!orders.length) return <p className="empty">No orders yet. Once you place an order, it will appear here.</p>;

  return (
    <div className="order-list">
      {orders.map(order => (
        <article className="order-card" key={order.id}>
          <div>
            <strong>Order #{order.id.slice(0, 8)}</strong>
            <span className="order-restaurant-name">
              {restaurants.find(restaurant => restaurant.id === order.restaurantId)?.name ?? 'Restaurant'}
            </span>
            <span>{order.lines.map(line => `${line.name} × ${line.quantity}`).join(', ')}</span>
            <small>{order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</small>
          </div>
          <div className="order-meta">
            <span className={`order-status status-pill-${order.status}`}>{order.status.replace('_', ' ')}</span>
            <b>{formatMoney(orderTotal(order))}</b>
          </div>
        </article>
      ))}
    </div>
  );
}
