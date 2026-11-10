import type { CartLine, MenuItem, Restaurant } from '../dashboard/dashboard.types';
import { formatMoney } from '../dashboard/dashboard.utils';
import { AddressPrompt } from './AddressPrompt';

type CartViewProps = {
  restaurant?: Restaurant;
  lines: CartLine[];
  total: number;
  busy: string | null;
  // undefined while the profile loads, false when the customer has no delivery address.
  hasAddress: boolean | undefined;
  onAddAddress: () => void;
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
  hasAddress,
  onAddAddress,
  onChangeQuantity,
  onPlaceOrder,
  onContinueBrowsing,
  onBrowseRestaurants,
}: CartViewProps) {
  return (
    <section className="panel storefront-panel narrow-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">READY WHEN YOU ARE</p>
          <h1>Your cart</h1>
          <p className="muted">Review your order before sending it to the restaurant.</p>
        </div>
      </div>
      {lines.length ? (
        <>
          <div className="cart-restaurant-note">
            Ordering from <strong>{restaurant?.name ?? 'your selected restaurant'}</strong>
          </div>
          <div className="cart-list">
            {lines.map(({ item, quantity }) => (
              <div className="cart-row storefront-cart-row" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <small>{formatMoney(item.price)} each</small>
                </div>
                <div className="quantity-control">
                  <button onClick={() => onChangeQuantity(item, -1)} aria-label={`Remove one ${item.name}`}>
                    −
                  </button>
                  <span>{quantity}</span>
                  <button onClick={() => onChangeQuantity(item, 1)} aria-label={`Add one ${item.name}`}>
                    +
                  </button>
                </div>
                <strong>{formatMoney(item.price * quantity)}</strong>
              </div>
            ))}
          </div>
          <div className="cart-total">
            <span>Subtotal</span>
            <strong>{formatMoney(total)}</strong>
          </div>
          <p className="muted checkout-note">Delivery fees, if applicable, are not included in this demo.</p>
          {hasAddress === false ? (
            <AddressPrompt
              message="Orders are delivered to it, so add one before placing this order."
              onAddAddress={onAddAddress}
            />
          ) : null}
          <button
            className="primary-button checkout-button"
            disabled={busy !== null || !hasAddress}
            onClick={onPlaceOrder}
          >
            {busy ? 'Placing order…' : `Place order · ${formatMoney(total)}`}
          </button>
          <button className="back-link centered-link" onClick={onContinueBrowsing}>
            ← Continue browsing
          </button>
        </>
      ) : (
        <div className="empty-cart">
          <span>🛒</span>
          <h2>Your cart is waiting</h2>
          <p>Add something delicious from a restaurant menu to get started.</p>
          <button className="primary-button" onClick={onBrowseRestaurants}>
            Browse restaurants
          </button>
        </div>
      )}
    </section>
  );
}
