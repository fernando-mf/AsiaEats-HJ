import { useState } from 'react';
import { DishArt } from '../food/DishArt';
import { dishKind } from '../food/dishKind';
import { IconSearch } from '../icons/Icons';
import type { Order, Restaurant } from '../dashboard/dashboard.types';
import { OrderHistory } from './OrderHistory';
import './home.css';

type CustomerHomeProps = {
  restaurants: Restaurant[];
  hasAddress: boolean;
  recentOrders: Order[];
  busy: string | null;
  onRefresh: () => void;
  onOpenRestaurant: (restaurantId: string) => void;
  onViewAllOrders: () => void;
};

const NEARBY_KM = 3;

function formatDistance(km: number) {
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

function RestaurantCard({ restaurant, onOpen }: { restaurant: Restaurant; onOpen: () => void }) {
  const open = restaurant.status === 'open';

  return (
    <button className={`restaurant-tile${open ? '' : ' is-unavailable'}`} type="button" onClick={onOpen}>
      <DishArt kind={dishKind(restaurant.name)} className="restaurant-tile-art" iconSize={44}>
        <span className={`restaurant-status status-${restaurant.status}`}>
          <i />
          {restaurant.status}
        </span>
      </DishArt>
      <span className="restaurant-tile-name">{restaurant.name}</span>
      <span className="restaurant-tile-meta">
        {open ? 'Taking orders now' : 'Not taking orders right now'}
        {restaurant.distanceKm !== undefined ? (
          <span className="mono"> · {formatDistance(restaurant.distanceKm)}</span>
        ) : null}
      </span>
    </button>
  );
}

export function CustomerHome({
  restaurants,
  hasAddress,
  recentOrders,
  busy,
  onRefresh,
  onOpenRestaurant,
  onViewAllOrders,
}: CustomerHomeProps) {
  const [query, setQuery] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const [nearbyOnly, setNearbyOnly] = useState(false);

  const search = query.trim().toLowerCase();
  const visible = restaurants.filter(
    restaurant =>
      (!search || restaurant.name.toLowerCase().includes(search)) &&
      (!openOnly || restaurant.status === 'open') &&
      (!nearbyOnly || (restaurant.distanceKm ?? Infinity) <= NEARBY_KM),
  );

  return (
    <div className="home">
      <section className="home-hero">
        <p className="eyebrow">Chinese food · Montréal</p>
        <h1>
          Find the dish first.
          <span>Then the kitchen that does it best.</span>
        </h1>
        <div className="home-search">
          <IconSearch size={20} />
          <input
            type="search"
            aria-label="Search restaurants"
            placeholder="Search a restaurant, e.g. “Golden Dragon”"
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
        </div>
      </section>

      <section className="home-section" aria-labelledby="home-restaurants-title">
        <div className="home-section-head">
          <h2 id="home-restaurants-title">
            {search ? `Restaurants matching “${query.trim()}”` : hasAddress ? 'Restaurants near you' : 'Restaurants'}
          </h2>
          <button className="ghost-button" onClick={onRefresh} disabled={busy !== null}>
            Refresh
          </button>
        </div>
        <div className="home-chips">
          <button className="chip" type="button" aria-pressed={openOnly} onClick={() => setOpenOnly(value => !value)}>
            Open now
          </button>
          {hasAddress ? (
            <button
              className="chip"
              type="button"
              aria-pressed={nearbyOnly}
              onClick={() => setNearbyOnly(value => !value)}
            >
              Within {NEARBY_KM} km
            </button>
          ) : null}
        </div>
        {visible.length ? (
          <div className="restaurant-tile-grid">
            {visible.map(restaurant => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                onOpen={() => onOpenRestaurant(restaurant.id)}
              />
            ))}
          </div>
        ) : (
          <p className="empty">
            {restaurants.length ? 'No restaurants match these filters.' : 'No restaurants are listed yet.'}
          </p>
        )}
      </section>

      {recentOrders.length ? (
        <section className="home-section" aria-labelledby="home-orders-title">
          <div className="home-section-head">
            <h2 id="home-orders-title">Recent orders</h2>
            <button className="text-button" onClick={onViewAllOrders}>
              View all →
            </button>
          </div>
          <OrderHistory orders={recentOrders} restaurants={restaurants} />
        </section>
      ) : null}
    </div>
  );
}
