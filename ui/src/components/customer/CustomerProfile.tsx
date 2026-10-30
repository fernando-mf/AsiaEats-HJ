import type { Account, Order, Restaurant } from '../dashboard/dashboard.types';
import { OrderHistory } from './OrderHistory';

type CustomerProfileProps = {
  account: Account;
  orders: Order[];
  restaurants: Restaurant[];
  busy: string | null;
  onRefreshOrders: () => void;
};

export function CustomerProfile({ account, orders, restaurants, busy, onRefreshOrders }: CustomerProfileProps) {
  const roleLabel = account.role.charAt(0).toUpperCase() + account.role.slice(1);

  return (
    <>
      <section className="profile-banner">
        <div className="profile-avatar">{account.name.trim().charAt(0).toUpperCase()}</div>
        <div>
          <p className="eyebrow">YOUR ACCOUNT</p>
          <h1>{account.name}</h1>
          <p>Manage your details and keep track of your orders.</p>
        </div>
      </section>
      <section className="panel storefront-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">PERSONAL INFORMATION</p>
            <h2>Profile details</h2>
          </div>
        </div>
        <div className="profile-details">
          <div className="profile-detail">
            <span>Full name</span>
            <strong>{account.name}</strong>
          </div>
          <div className="profile-detail">
            <span>Username</span>
            <strong>@{account.username}</strong>
          </div>
          <div className="profile-detail">
            <span>Email address</span>
            <strong>{account.email || 'Not provided for this account'}</strong>
            {!account.email ? (
              <small>
                This version of EatChinese uses usernames to sign in and does not currently store an email address.
              </small>
            ) : null}
          </div>
          <div className="profile-detail">
            <span>Account type</span>
            <strong>{roleLabel}</strong>
          </div>
        </div>
      </section>
      <section className="panel storefront-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">ORDER HISTORY</p>
            <h2>Your previous orders</h2>
            <p className="muted">Track the status and total of each order you’ve placed.</p>
          </div>
          <button className="secondary-button" onClick={onRefreshOrders} disabled={busy !== null}>
            Refresh
          </button>
        </div>
        <OrderHistory orders={orders} restaurants={restaurants} />
      </section>
    </>
  );
}
