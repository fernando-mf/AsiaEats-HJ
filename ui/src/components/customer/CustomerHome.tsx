import { useState } from 'react';
import { DishArt } from '../food/DishArt';
import { dishKind } from '../food/dishKind';
import { IconArrowRight, IconPlus, IconSearch } from '../icons/Icons';
import type { MenuItem, Restaurant } from '../dashboard/dashboard.types';
import { formatDistance, formatMoney } from '../dashboard/dashboard.utils';
import { AddressPrompt } from './AddressPrompt';
import './home.css';

type CustomerHomeProps = {
  restaurants: Restaurant[];
  menus: Record<string, MenuItem[]>;
  hasAddress: boolean;
  busy: string | null;
  onRefresh: () => void;
  onOpenRestaurant: (restaurantId: string) => void;
  onAddDish: (item: MenuItem) => void;
  // Set only when the customer has no delivery address; shows a prompt to add one.
  onAddAddress?: () => void;
};

type Dish = {
  item: MenuItem;
  restaurant: Restaurant;
};

const NEARBY_KM = 3;
const QUICK_PICKS = 5;

function RestaurantCard({
  restaurant,
  dishCount,
  onOpen,
}: {
  restaurant: Restaurant;
  dishCount: number | undefined;
  onOpen: () => void;
}) {
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
        {dishCount !== undefined ? ` · ${dishCount} ${dishCount === 1 ? 'dish' : 'dishes'}` : null}
        {restaurant.distanceKm !== undefined ? (
          <span className="mono"> · {formatDistance(restaurant.distanceKm)}</span>
        ) : null}
      </span>
    </button>
  );
}

function DishCard({ dish, onAdd, onOpenRestaurant }: { dish: Dish; onAdd: () => void; onOpenRestaurant: () => void }) {
  const { item, restaurant } = dish;

  return (
    <article className="card dish-card">
      <DishArt kind={dishKind(item.name)} className="dish-card-art" iconSize={44} />
      <div className="dish-card-body">
        <strong>{item.name}</strong>
        <button className="dish-card-restaurant" type="button" onClick={onOpenRestaurant}>
          {restaurant.name}
          {restaurant.distanceKm !== undefined ? ` · ${formatDistance(restaurant.distanceKm)}` : ''}
        </button>
        <div className="dish-card-foot">
          <span className="mono">{formatMoney(item.price)}</span>
          <button
            className="primary-button icon-button"
            type="button"
            aria-label={`Add ${item.name} to cart`}
            onClick={onAdd}
          >
            <IconPlus size={17} />
          </button>
        </div>
      </div>
    </article>
  );
}

function Spotlight({ restaurant, menu, onOpen }: { restaurant: Restaurant; menu: MenuItem[]; onOpen: () => void }) {
  const available = menu.filter(item => item.status === 'available');

  return (
    <section className="card home-spotlight" aria-labelledby="home-spotlight-title">
      <DishArt kind={dishKind(available[0]?.name ?? restaurant.name)} className="home-spotlight-art" iconSize={72} />
      <div className="home-spotlight-body">
        <p className="eyebrow">Local spotlight</p>
        <div>
          <h3 id="home-spotlight-title">{restaurant.name}</h3>
          <p className="muted">
            {menu.length} {menu.length === 1 ? 'dish' : 'dishes'} on the menu
            {restaurant.distanceKm !== undefined ? ` · ${formatDistance(restaurant.distanceKm)} away` : ''}
          </p>
        </div>
        <ul className="home-spotlight-menu">
          {available.slice(0, 3).map(item => (
            <li key={item.id}>
              <span>{item.name}</span>
              <span className="mono">{formatMoney(item.price)}</span>
            </li>
          ))}
        </ul>
        <button className="primary-button home-spotlight-action" type="button" onClick={onOpen}>
          View menu
          <IconArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}

export function CustomerHome({
  restaurants,
  menus,
  hasAddress,
  busy,
  onRefresh,
  onOpenRestaurant,
  onAddDish,
  onAddAddress,
}: CustomerHomeProps) {
  const [query, setQuery] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const [nearbyOnly, setNearbyOnly] = useState(false);

  const search = query.trim().toLowerCase();
  const matches = (text: string) => text.toLowerCase().includes(search);

  // Orderable dishes: available items of open restaurants, nearest restaurant first.
  const dishes: Dish[] = restaurants
    .filter(restaurant => restaurant.status === 'open')
    .flatMap(restaurant =>
      (menus[restaurant.id] ?? []).filter(item => item.status === 'available').map(item => ({ item, restaurant })),
    );
  const pick = dishes[0];
  // Spotlight an open restaurant with dishes, preferably not the one already in Tonight's pick.
  const spotlightCandidates = restaurants.filter(
    restaurant =>
      restaurant.status === 'open' && (menus[restaurant.id] ?? []).some(item => item.status === 'available'),
  );
  const spotlight =
    spotlightCandidates.find(restaurant => restaurant.id !== pick?.restaurant.id) ?? spotlightCandidates[0];
  const quickPicks = [...new Set(dishes.map(dish => dish.item.name))].slice(0, QUICK_PICKS);
  const matchingDishes = search
    ? dishes.filter(dish => matches(dish.item.name) || matches(dish.restaurant.name))
    : dishes;

  const visibleRestaurants = restaurants.filter(
    restaurant =>
      (!search || matches(restaurant.name) || (menus[restaurant.id] ?? []).some(item => matches(item.name))) &&
      (!openOnly || restaurant.status === 'open') &&
      (!nearbyOnly || (restaurant.distanceKm ?? Infinity) <= NEARBY_KM),
  );

  return (
    <div className="home">
      {onAddAddress ? (
        <AddressPrompt
          message="You need one to place an order, and restaurant distances are measured from it."
          onAddAddress={onAddAddress}
        />
      ) : null}

      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow">Chinese food · Montréal</p>
          <h1>
            Find the dish first.
            <span>Then the kitchen that does it best.</span>
          </h1>
          <div className="home-search">
            <IconSearch size={20} />
            <input
              type="search"
              aria-label="Search dishes or restaurants"
              placeholder="Try “dan dan noodles” or “Golden Dragon”"
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
          </div>
          {quickPicks.length ? (
            <div className="home-quick-picks">
              <span className="mono">TRY</span>
              {quickPicks.map(name => (
                <button className="chip" type="button" key={name} onClick={() => setQuery(name)}>
                  {name}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {pick ? (
          <article className="home-pick">
            <DishArt kind={dishKind(pick.item.name)} className="home-pick-art" iconSize={72} />
            <div className="home-pick-card">
              <div className="home-pick-text">
                <p className="eyebrow">Tonight’s pick</p>
                <strong>{pick.item.name}</strong>
                <span>
                  {pick.restaurant.name}
                  {pick.restaurant.distanceKm !== undefined ? ` · ${formatDistance(pick.restaurant.distanceKm)}` : ''}
                </span>
              </div>
              <span className="mono">{formatMoney(pick.item.price)}</span>
              <button
                className="primary-button icon-button"
                type="button"
                aria-label={`Add ${pick.item.name} to cart`}
                onClick={() => onAddDish(pick.item)}
              >
                <IconPlus size={17} />
              </button>
            </div>
          </article>
        ) : null}
      </section>

      {dishes.length ? (
        <section className="home-section" aria-labelledby="home-dishes-title">
          <div className="home-section-head">
            <h2 id="home-dishes-title">
              {search ? `Dishes matching “${query.trim()}”` : hasAddress ? 'Dishes near you' : 'Dishes to try'}
            </h2>
          </div>
          {matchingDishes.length ? (
            <div className="dish-card-grid">
              {matchingDishes.slice(0, search ? 8 : 4).map(dish => (
                <DishCard
                  key={dish.item.id}
                  dish={dish}
                  onAdd={() => onAddDish(dish.item)}
                  onOpenRestaurant={() => onOpenRestaurant(dish.restaurant.id)}
                />
              ))}
            </div>
          ) : (
            <p className="empty">No dishes match your search.</p>
          )}
        </section>
      ) : null}

      {spotlight && !search ? (
        <Spotlight
          restaurant={spotlight}
          menu={menus[spotlight.id] ?? []}
          onOpen={() => onOpenRestaurant(spotlight.id)}
        />
      ) : null}

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
        {visibleRestaurants.length ? (
          <div className="restaurant-tile-grid">
            {visibleRestaurants.map(restaurant => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                dishCount={menus[restaurant.id]?.length}
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
    </div>
  );
}
