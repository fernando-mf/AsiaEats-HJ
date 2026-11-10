import { useState } from 'react';
import { neighbourhoodShortName } from '../../shared/locations/montrealNeighbourhoods';
import type { CartLine, MenuItem, Restaurant } from '../dashboard/dashboard.types';
import { formatDistance, formatMoney, initials } from '../dashboard/dashboard.utils';
import { DishArt } from '../food/DishArt';
import { dishKind } from '../food/dishKind';
import { IconArrowLeft, IconArrowRight, IconPin, IconPlus, IconSearch } from '../icons/Icons';
import { QuantityStepper } from './QuantityStepper';
import './storefront.css';

type RestaurantMenuProps = {
  restaurant?: Restaurant;
  menu: MenuItem[];
  // Quantity in the cart per menu item id. The cart holds this restaurant's items only.
  cart: Record<string, number>;
  lines: CartLine[];
  total: number;
  // The customer's delivery street; null when they have none, undefined while it loads.
  deliveryStreet: string | null | undefined;
  onBack: () => void;
  onCheckout: () => void;
  onAddToCart: (item: MenuItem) => void;
  onChangeQuantity: (item: MenuItem, delta: number) => void;
  onAddAddress: () => void;
};

// Available dishes first, sold-out ones last; otherwise the restaurant's own order.
function byAvailability(a: MenuItem, b: MenuItem) {
  return Number(a.status !== 'available') - Number(b.status !== 'available');
}

function DishTile({
  item,
  quantity,
  orderable,
  onAdd,
  onChangeQuantity,
}: {
  item: MenuItem;
  quantity: number;
  orderable: boolean;
  onAdd: () => void;
  onChangeQuantity: (delta: number) => void;
}) {
  const soldOut = item.status !== 'available';

  return (
    <article className={`card storefront-dish${soldOut ? ' is-sold-out' : ''}${quantity ? ' is-in-cart' : ''}`}>
      <DishArt kind={dishKind(item.name)} className="storefront-dish-art" iconSize={40} />
      <div className="storefront-dish-body">
        <strong>{item.name}</strong>
        <div className="storefront-dish-foot">
          <span className="mono">{formatMoney(item.price)}</span>
          {soldOut ? (
            <span className="pill">Sold out</span>
          ) : quantity ? (
            <QuantityStepper name={item.name} quantity={quantity} canIncrease={orderable} onChange={onChangeQuantity} />
          ) : (
            <button
              className="primary-button icon-button"
              type="button"
              aria-label={`Add ${item.name} to cart`}
              disabled={!orderable}
              onClick={onAdd}
            >
              <IconPlus size={17} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function OrderSummary({
  lines,
  total,
  deliveryStreet,
  orderable,
  onCheckout,
  onAddAddress,
}: Pick<RestaurantMenuProps, 'lines' | 'total' | 'deliveryStreet' | 'onCheckout' | 'onAddAddress'> & {
  orderable: boolean;
}) {
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <aside className="card storefront-order" aria-labelledby="storefront-order-title">
      <div className="storefront-order-head">
        <h2 id="storefront-order-title">Your order</h2>
        <span className="mono">
          {count} {count === 1 ? 'item' : 'items'}
        </span>
      </div>

      {lines.length ? (
        <ul className="storefront-order-lines">
          {lines.map(({ item, quantity }) => (
            <li key={item.id}>
              <span className="mono">{quantity}×</span>
              <span>{item.name}</span>
              <span className="mono">{formatMoney(item.price * quantity)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="storefront-order-empty">Your cart is empty. Add dishes from the menu to start an order.</p>
      )}

      <div className="storefront-order-total">
        <span>Subtotal</span>
        <span className="mono">{formatMoney(total)}</span>
      </div>

      {deliveryStreet ? (
        <p className="storefront-order-address">
          <IconPin size={15} />
          <span>
            Delivering to <strong>{deliveryStreet}</strong>
          </span>
        </p>
      ) : deliveryStreet === null ? (
        <button className="storefront-order-address is-missing" type="button" onClick={onAddAddress}>
          <IconPin size={15} />
          <span>Add a delivery address to order</span>
        </button>
      ) : null}

      <button
        className="primary-button storefront-checkout"
        type="button"
        disabled={!lines.length || !orderable}
        onClick={onCheckout}
      >
        Go to checkout
        <IconArrowRight size={16} />
      </button>
    </aside>
  );
}

export function RestaurantMenu({
  restaurant,
  menu,
  cart,
  lines,
  total,
  deliveryStreet,
  onBack,
  onCheckout,
  onAddToCart,
  onChangeQuantity,
  onAddAddress,
}: RestaurantMenuProps) {
  const [query, setQuery] = useState('');

  if (!restaurant) {
    return (
      <div className="storefront">
        <button className="storefront-crumb" type="button" onClick={onBack}>
          <IconArrowLeft size={15} />
          Discover
        </button>
        <p className="empty">Loading the restaurant…</p>
      </div>
    );
  }

  const orderable = restaurant.status === 'open';
  const search = query.trim().toLowerCase();
  const soldOutCount = menu.filter(item => item.status !== 'available').length;
  const visibleItems = menu.filter(item => item.name.toLowerCase().includes(search)).sort(byAvailability);
  const neighbourhood = neighbourhoodShortName(restaurant.position.latitude, restaurant.position.longitude);
  const place = [
    restaurant.distanceKm !== undefined ? formatDistance(restaurant.distanceKm) : undefined,
    neighbourhood,
  ].filter(Boolean);
  const cartCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div className={`storefront${cartCount ? ' has-cart-bar' : ''}`}>
      <button className="storefront-crumb" type="button" onClick={onBack}>
        <IconArrowLeft size={15} />
        Discover <span>/ {restaurant.name}</span>
      </button>

      <DishArt
        kind={dishKind(restaurant.name)}
        className={`storefront-cover${orderable ? '' : ' is-unavailable'}`}
        iconSize={84}
      />

      <section className="storefront-head" aria-labelledby="storefront-name">
        <span className="storefront-monogram" aria-hidden="true">
          {initials(restaurant.name)}
        </span>
        <div className="storefront-head-text">
          <div className="storefront-title">
            <h1 id="storefront-name">{restaurant.name}</h1>
            <span className={`restaurant-status status-${restaurant.status}`}>
              <i />
              {restaurant.status}
            </span>
          </div>
          <p className="storefront-meta">
            {place.length ? (
              <span>
                <IconPin size={15} />
                {place.join(' · ')}
              </span>
            ) : null}
            <span>
              {menu.length} {menu.length === 1 ? 'dish' : 'dishes'}
              {soldOutCount ? ` · ${soldOutCount} sold out` : ''}
            </span>
          </p>
        </div>
      </section>

      {!orderable ? (
        <p className="storefront-notice" role="status">
          {restaurant.name} is {restaurant.status} and isn’t taking orders right now. You can browse the menu, but
          adding dishes is off until it reopens.
        </p>
      ) : null}

      <div className="storefront-body">
        <section className="storefront-menu" aria-labelledby="storefront-menu-title">
          <div className="storefront-menu-head">
            <h2 id="storefront-menu-title">Menu</h2>
            {menu.length ? (
              <label className="storefront-search">
                <IconSearch size={15} />
                <input
                  type="search"
                  aria-label="Search the menu"
                  placeholder="Search menu"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                />
              </label>
            ) : null}
          </div>

          {!menu.length ? (
            <p className="empty">This restaurant hasn’t added any dishes yet.</p>
          ) : visibleItems.length ? (
            <div className="storefront-dish-grid">
              {visibleItems.map(item => (
                <DishTile
                  key={item.id}
                  item={item}
                  quantity={cart[item.id] ?? 0}
                  orderable={orderable}
                  onAdd={() => onAddToCart(item)}
                  onChangeQuantity={delta => onChangeQuantity(item, delta)}
                />
              ))}
            </div>
          ) : (
            <p className="empty">No dishes match “{query.trim()}”.</p>
          )}
        </section>

        <OrderSummary
          lines={lines}
          total={total}
          deliveryStreet={deliveryStreet}
          orderable={orderable}
          onCheckout={onCheckout}
          onAddAddress={onAddAddress}
        />
      </div>

      {cartCount ? (
        <div className="storefront-cart-bar">
          <button className="primary-button" type="button" onClick={onCheckout}>
            View cart · {cartCount} {cartCount === 1 ? 'item' : 'items'}
            <span className="mono">{formatMoney(total)}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
