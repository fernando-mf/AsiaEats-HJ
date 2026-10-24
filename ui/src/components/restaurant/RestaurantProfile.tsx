import type { FormEvent } from 'react';
import type { Account, Restaurant } from '../dashboard/dashboard.types';

type RestaurantProfileProps = {
  account: Account;
  restaurant?: Restaurant;
  email: string;
  onEmailChange: (email: string) => void;
  onSaveEmail: (event: FormEvent<HTMLFormElement>) => void;
};

export function RestaurantProfile({ account, restaurant, email, onEmailChange, onSaveEmail }: RestaurantProfileProps) {
  return (
    <>
      <section className="profile-banner">
        <div className="profile-avatar">{(restaurant?.name ?? account.name).trim().charAt(0).toUpperCase()}</div>
        <div>
          <p className="eyebrow">RESTAURANT PROFILE</p>
          <h1>{restaurant?.name ?? 'Your restaurant'}</h1>
          <p>Review your restaurant and account details.</p>
        </div>
      </section>
      <section className="panel storefront-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">RESTAURANT DETAILS</p>
            <h2>Profile information</h2>
          </div>
        </div>
        <div className="profile-details">
          <div className="profile-detail">
            <span>Restaurant name</span>
            <strong>{restaurant?.name ?? 'Not available'}</strong>
          </div>
          <div className="profile-detail">
            <span>Restaurant status</span>
            <strong>{restaurant?.status ?? 'Not available'}</strong>
          </div>
          <div className="profile-detail">
            <span>Account name</span>
            <strong>{account.name}</strong>
          </div>
          <div className="profile-detail">
            <span>Username</span>
            <strong>@{account.username}</strong>
          </div>
        </div>
        <form className="restaurant-email-form" onSubmit={onSaveEmail}>
          <label>
            Contact email
            <input
              type="email"
              value={email}
              onChange={event => onEmailChange(event.target.value)}
              placeholder="restaurant@example.com"
            />
          </label>
          <button className="primary-button" type="submit">
            Save email on this device
          </button>
          <p className="muted">
            Frontend-only: this contact email is saved in this browser, not to your account or the server.
          </p>
        </form>
      </section>
    </>
  );
}
