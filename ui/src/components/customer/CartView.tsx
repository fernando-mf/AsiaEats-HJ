import { neighbourhoodShortName } from '../../shared/locations/montrealNeighbourhoods';
import type { Address, CartLine, MenuItem, Restaurant } from '../dashboard/dashboard.types';
import { formatDistance, formatMoney, initials } from '../dashboard/dashboard.utils';
import { DishArt } from '../food/DishArt';
import { dishKind } from '../food/dishKind';
import { IconArrowLeft, IconBag, IconPin, IconPlus } from '../icons/Icons';
import { AddressPrompt } from './AddressPrompt';
import { QuantityStepper } from './QuantityStepper';
import './checkout.css';

type CartViewProps = {
  restaurant?: Restaurant;
  lines: CartLine[];
  total: number;
  busy: string | null;
  // The customer's delivery address; null when they have none, undefined while it loads.
  address: Address | null | undefined;
  onEditAddress: () => void;
  onChangeQuantity: (item: MenuItem, delta: number) => void;
  onPlaceOrder: () => void;
  onContinueBrowsing: () => void;
  onBrowseRestaurants: () => void;
};

export function CartView({
  restaurant,
  lines,
  total,
  busy,
  address,
  onEditAddress,
  onChangeQuantity,
  onPlaceOrder,
  onContinueBrowsing,
  onBrowseRestaurants,
}: CartViewProps) {
  if (!lines.length) {
    return (
      <div className="checkout">
        <h1 className="checkout-title">Checkout</h1>
        <section className="card checkout-empty">
          <span className="checkout-empty-icon" aria-hidden="true">
            <IconBag size={26} />
          </span>
          <h2>Your cart is empty</h2>
          <p>Add dishes from a restaurant’s menu and they’ll show up here.</p>
          <button className="primary-button" type="button" onClick={onBrowseRestaurants}>
            Browse restaurants
          </button>
        </section>
      </div>
    );
  }

  const restaurantName = restaurant?.name ?? 'the restaurant';
  const open = restaurant?.status === 'open';
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const addressPlace = address ? neighbourhoodShortName(address.latitude, address.longitude) : undefined;
  const restaurantPlace = restaurant
    ? [
        restaurant.distanceKm !== undefined ? formatDistance(restaurant.distanceKm) : undefined,
        neighbourhoodShortName(restaurant.position.latitude, restaurant.position.longitude),
      ].filter(Boolean)
    : [];
  const canPlace = Boolean(address) && open && busy === null;

  return (
    <div className="checkout">
      <div className="checkout-heading">
        <button className="storefront-crumb" type="button" onClick={onContinueBrowsing}>
          <IconArrowLeft size={15} />
          Back to {restaurantName}
        </button>
        <h1 className="checkout-title">Checkout</h1>
      </div>

      {restaurant && !open ? (
        <p className="storefront-notice" role="status">
          {restaurant.name} is {restaurant.status} and isn’t taking orders right now, so this order can’t be placed
          until it reopens.
        </p>
      ) : null}

      <div className="checkout-body">
        <div className="checkout-steps">
          <section className="card checkout-step" aria-labelledby="checkout-address-title">
            <div className="checkout-step-head">
              <span className="checkout-step-number mono" aria-hidden="true">
                1
              </span>
              <h2 id="checkout-address-title">Delivery address</h2>
            </div>
            {address ? (
              <div className="checkout-address">
                <span className="checkout-address-icon">
                  <IconPin size={18} />
                </span>
                <span className="checkout-address-text">
                  <strong>{address.street}</strong>
                  <span>
                    {address.city}, {address.postalCode}
                    {addressPlace ? ` · ${addressPlace}` : ''}
                  </span>
                </span>
                <button className="ghost-button" type="button" onClick={onEditAddress}>
                  Edit
                </button>
              </div>
            ) : address === null ? (
              <AddressPrompt
                message="Orders are delivered to it, so add one before placing this order."
                onAddAddress={onEditAddress}
              />
            ) : (
              <p className="muted">Loading your address…</p>
            )}
          </section>

          <section className="card checkout-step" aria-labelledby="checkout-items-title">
            <div className="checkout-step-head">
              <span className="checkout-step-number mono" aria-hidden="true">
                2
              </span>
              <h2 id="checkout-items-title">Your items</h2>
              <span className="checkout-step-meta mono">
                {count} {count === 1 ? 'item' : 'items'}
              </span>
            </div>
            <ul className="checkout-lines">
              {lines.map(({ item, quantity }) => (
                <li key={item.id}>
                  <DishArt kind={dishKind(item.name)} className="checkout-line-art" iconSize={22} />
                  <span className="checkout-line-text">
                    <strong>{item.name}</strong>
                    <span className="mono">{formatMoney(item.price)} each</span>
                  </span>
                  <QuantityStepper
                    name={item.name}
                    quantity={quantity}
                    canIncrease={open}
                    onChange={delta => onChangeQuantity(item, delta)}
                  />
                  <span className="checkout-line-total mono">{formatMoney(item.price * quantity)}</span>
                </li>
              ))}
            </ul>
            <button className="text-button checkout-add-more" type="button" onClick={onContinueBrowsing}>
              <IconPlus size={15} />
              Add more from {restaurantName}
            </button>
          </section>
        </div>

        <aside className="card checkout-summary" aria-label="Order summary">
          <div className="checkout-restaurant">
            <span className="checkout-restaurant-tile" aria-hidden="true">
              {initials(restaurantName)}
            </span>
            <span>
              <strong>{restaurantName}</strong>
              {restaurantPlace.length ? <span>{restaurantPlace.join(' · ')}</span> : null}
            </span>
          </div>

          <dl className="checkout-totals">
            <div>
              <dt>Subtotal</dt>
              <dd className="mono">{formatMoney(total)}</dd>
            </div>
            <div className="checkout-grand-total">
              <dt>Total</dt>
              <dd className="mono">{formatMoney(total)}</dd>
            </div>
          </dl>

          <button className="primary-button checkout-place" type="button" disabled={!canPlace} onClick={onPlaceOrder}>
            {busy ? 'Placing order…' : `Place order · ${formatMoney(total)}`}
          </button>
          <p className="checkout-fineprint">
            {address === null
              ? 'Add a delivery address to place this order.'
              : 'You can cancel while the order is still Placed. Once the restaurant accepts it, it can no longer be cancelled.'}
          </p>
        </aside>
      </div>
    </div>
  );
}
