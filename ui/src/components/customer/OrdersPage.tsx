import type { Order, Restaurant } from '../dashboard/dashboard.types';
import { OrderHistory } from './OrderHistory';

type OrdersPageProps = {
  orders: Order[];
  restaurants: Restaurant[];
  busy: string | null;
  onRefreshOrders: () => void;
};

export function OrdersPage({ orders, restaurants, busy, onRefreshOrders }: OrdersPageProps) {
  return (
    <section className="panel storefront-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">ORDER HISTORY</p>
          <h2>Your orders</h2>
          <p className="muted">Track the status and total of each order you’ve placed.</p>
        </div>
        <button className="secondary-button" onClick={onRefreshOrders} disabled={busy !== null}>
          Refresh
        </button>
      </div>
      <OrderHistory orders={orders} restaurants={restaurants} />
    </section>
  );
}
