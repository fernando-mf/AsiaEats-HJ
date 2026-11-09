import { useState } from 'react';
import { findNeighbourhood } from '../../shared/locations/montrealNeighbourhoods';
import { PasswordSection, PersonalInfoForm } from '../account/AccountForms';
import { DishArt } from '../food/DishArt';
import { dishKind } from '../food/dishKind';
import { IconPin } from '../icons/Icons';
import type { Account, MenuItem, Order, Position, Restaurant, RestaurantStatus } from '../dashboard/dashboard.types';
import { RestaurantDetailsForm } from './RestaurantDetailsForm';
import '../account/profile.css';
import './restaurant-profile.css';

type RestaurantProfileProps = {
  account: Account;
  restaurant?: Restaurant;
  menu: MenuItem[];
  orders: Order[];
  busy: string | null;
  onSaveDetails: (name: string, position: Position) => Promise<boolean>;
  onChangeStatus: (status: RestaurantStatus) => void;
  onSaveName: (name: string) => Promise<boolean>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
};

const statuses: RestaurantStatus[] = ['open', 'paused', 'closed'];

// Only open restaurants take orders (OrdersService.place); orders already placed carry on.
const statusNotes: Record<RestaurantStatus, string> = {
  open: 'You’re taking orders. Customers can order from your menu.',
  paused: 'New orders are stopped for now. Orders already placed stay on your board and still need to be finished.',
  closed: 'Customers can’t order until you reopen. Orders already placed still need to be finished.',
};

function locationLabel(position: Position) {
  const neighbourhood = findNeighbourhood(position.latitude, position.longitude);
  return neighbourhood
    ? neighbourhood.name.split(' (')[0]
    : `${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}`;
}

function isToday(date: string, today: Date) {
  const created = new Date(date);
  return (
    created.getFullYear() === today.getFullYear() &&
    created.getMonth() === today.getMonth() &&
    created.getDate() === today.getDate()
  );
}

export function RestaurantProfile({
  account,
  restaurant,
  menu,
  orders,
  busy,
  onSaveDetails,
  onChangeStatus,
  onSaveName,
  onChangePassword,
}: RestaurantProfileProps) {
  // Taken once on mount: used to pick out today's orders.
  const [today] = useState(() => new Date());

  if (!restaurant) {
    return (
      <section className="card profile-card">
        <p className="muted">Loading your restaurant…</p>
      </section>
    );
  }

  const stats = [
    { label: 'orders today', value: orders.filter(order => isToday(order.createdAt, today)).length },
    { label: 'waiting to accept', value: orders.filter(order => order.status === 'placed').length },
    { label: 'dishes on the menu', value: menu.length },
    { label: 'sold out', value: menu.filter(item => item.status === 'sold_out').length },
  ];
  // Remount the details form when the saved values change so its fields start from them.
  const detailsKey = `${restaurant.name}|${restaurant.position.latitude}|${restaurant.position.longitude}`;

  return (
    <div className="profile-page">
      <p className="eyebrow">Restaurant settings</p>

      <section className="card restaurant-hero" aria-labelledby="restaurant-hero-name">
        <DishArt kind={dishKind(menu[0]?.name ?? '')} className="restaurant-hero-cover" iconSize={64} />
        <div className="restaurant-hero-body">
          <span className="restaurant-hero-tile" aria-hidden="true">
            {restaurant.name.trim().charAt(0).toUpperCase()}
          </span>
          <div className="profile-hero-main">
            <div className="profile-hero-title">
              <h1 id="restaurant-hero-name">{restaurant.name}</h1>
              <span className={`restaurant-status status-${restaurant.status}`}>
                <i aria-hidden="true" />
                {restaurant.status}
              </span>
            </div>
            <span className="restaurant-hero-meta">
              <IconPin size={14} />
              {locationLabel(restaurant.position)}
            </span>
          </div>
        </div>
      </section>

      <div className="profile-grid">
        <div className="profile-column">
          <section className="card profile-card" aria-labelledby="restaurant-details-title">
            <div className="profile-card-head">
              <h2 id="restaurant-details-title">Restaurant details</h2>
              <p>What customers see when they browse restaurants.</p>
            </div>
            <RestaurantDetailsForm key={detailsKey} restaurant={restaurant} busy={busy} onSave={onSaveDetails} />
          </section>

          <section className="card profile-card" aria-labelledby="restaurant-account-title">
            <div className="profile-card-head">
              <h2 id="restaurant-account-title">Your account</h2>
              <p>The owner account you sign in with.</p>
            </div>
            <PersonalInfoForm key={account.name} account={account} busy={busy} onSaveName={onSaveName} />
            <hr className="profile-divider" />
            <PasswordSection account={account} busy={busy} onChangePassword={onChangePassword} />
          </section>
        </div>

        <div className="profile-column">
          <section className="card profile-card" aria-labelledby="restaurant-status-title">
            <div className="profile-card-head">
              <h2 id="restaurant-status-title">Store status</h2>
            </div>
            <div className="segmented restaurant-status-control" role="group" aria-labelledby="restaurant-status-title">
              {statuses.map(status => (
                <button
                  key={status}
                  type="button"
                  aria-pressed={restaurant.status === status}
                  disabled={busy !== null}
                  onClick={() => restaurant.status !== status && onChangeStatus(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
            <p className="restaurant-status-note">{statusNotes[restaurant.status]}</p>
          </section>

          <section className="card profile-card" aria-labelledby="restaurant-today-title">
            <div className="profile-card-head">
              <h2 id="restaurant-today-title">At a glance</h2>
            </div>
            <dl className="restaurant-stats">
              {stats.map(stat => (
                <div key={stat.label}>
                  <dt>{stat.label}</dt>
                  <dd>{stat.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
