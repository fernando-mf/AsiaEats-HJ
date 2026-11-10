import type { ReactNode } from 'react';
import type { RestaurantPage } from '../../shared/dashboard/dashboardSession';
import { neighbourhoodShortName } from '../../shared/locations/montrealNeighbourhoods';
import { BrandMark } from '../brand/BrandMark';
import { IconMenuBook, IconReceipt, IconSignOut, IconStore } from '../icons/Icons';
import type { Account, Restaurant } from '../dashboard/dashboard.types';
import { initials } from '../dashboard/dashboard.utils';
import './restaurant-shell.css';

type RestaurantSidebarProps = {
  account: Account;
  restaurant?: Restaurant;
  page: RestaurantPage;
  // Orders waiting for the restaurant to accept or reject them.
  newOrderCount: number;
  busy: string | null;
  onPageChange: (page: RestaurantPage) => void;
  onToggleAccepting: () => void;
  onLogout: () => void;
};

const links: Array<{ page: RestaurantPage; label: string; icon: ReactNode }> = [
  { page: 'orders', label: 'Orders', icon: <IconReceipt size={17} /> },
  { page: 'menu', label: 'Menu', icon: <IconMenuBook size={17} /> },
  { page: 'profile', label: 'Profile', icon: <IconStore size={17} /> },
];

// RestaurantSidebar is the restaurant portal's navigation: the restaurant, its pages, an
// "Accepting orders" switch (Open <-> Paused) and the signed-in owner.
export function RestaurantSidebar({
  account,
  restaurant,
  page,
  newOrderCount,
  busy,
  onPageChange,
  onToggleAccepting,
  onLogout,
}: RestaurantSidebarProps) {
  const accepting = restaurant?.status === 'open';
  const place = restaurant
    ? (neighbourhoodShortName(restaurant.position.latitude, restaurant.position.longitude) ?? 'Montréal')
    : undefined;

  return (
    <aside className="restaurant-sidebar">
      <BrandMark />

      <div className="sidebar-restaurant">
        <span className="sidebar-restaurant-tile" aria-hidden="true">
          {(restaurant?.name ?? '?').trim().charAt(0).toUpperCase()}
        </span>
        <span className="sidebar-restaurant-text">
          <strong>{restaurant?.name ?? 'Loading…'}</strong>
          {place ? <span>{place}</span> : null}
        </span>
      </div>

      <nav className="sidebar-nav" aria-label="Restaurant sections">
        {links.map(link => (
          <button
            key={link.page}
            type="button"
            className="sidebar-link"
            aria-current={page === link.page ? 'page' : undefined}
            onClick={() => onPageChange(link.page)}
          >
            {link.icon}
            {link.label}
            {link.page === 'orders' && newOrderCount > 0 ? (
              <span className="sidebar-badge mono" aria-label={`${newOrderCount} new`}>
                {newOrderCount}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      {restaurant ? (
        <div className="sidebar-accepting">
          <div className="sidebar-accepting-row">
            <span id="sidebar-accepting-label">Accepting orders</span>
            <button
              type="button"
              role="switch"
              className="switch"
              aria-checked={accepting}
              aria-labelledby="sidebar-accepting-label"
              disabled={busy !== null}
              onClick={onToggleAccepting}
            >
              <span />
            </button>
          </div>
          <p>
            {restaurant.status === 'closed'
              ? 'You’re closed. Turn this on to open for orders.'
              : 'Pausing stops new orders. Orders in progress still need to be finished.'}
          </p>
        </div>
      ) : null}

      <div className="sidebar-owner">
        <span className="sidebar-owner-avatar" aria-hidden="true">
          {initials(account.name)}
        </span>
        <span className="sidebar-owner-text">
          <strong>{account.name}</strong>
          <span>Owner</span>
        </span>
        <button className="ghost-button icon-button" type="button" aria-label="Sign out" onClick={onLogout}>
          <IconSignOut size={18} />
        </button>
      </div>
    </aside>
  );
}
