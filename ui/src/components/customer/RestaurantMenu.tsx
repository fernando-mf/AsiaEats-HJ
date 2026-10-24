import type { MenuItem, Restaurant } from '../dashboard/dashboard.types';
import { formatMoney } from '../dashboard/dashboard.utils';

type RestaurantMenuProps = {
  restaurant?: Restaurant;
  menu: MenuItem[];
  cart: Record<string, number>;
  cartCount: number;
  busy: string | null;
  onBack: () => void;
  onViewCart: () => void;
  onAddToCart: (item: MenuItem) => void;
};

export function RestaurantMenu({
  restaurant,
  menu,
  cart,
  cartCount,
  busy,
  onBack,
  onViewCart,
  onAddToCart,
}: RestaurantMenuProps) {
  return (
    <section className="panel storefront-panel">
      <button className="back-link" onClick={onBack}>
        ← All restaurants
      </button>
      <div className="menu-hero">
        <span className="menu-hero-art">🥢</span>
        <div>
          <p className="eyebrow">RESTAURANT MENU</p>
          <h1>{restaurant?.name ?? 'Restaurant menu'}</h1>
          <p className="muted">Freshly made favourites, ready to order.</p>
          <span className={`restaurant-status status-${restaurant?.status ?? 'closed'}`}>
            <i />
            {restaurant?.status ?? 'status unavailable'}
          </span>
        </div>
      </div>
      <div className="panel-heading menu-heading">
        <div>
          <h2>Full menu</h2>
          <p className="muted">Choose your favourites and add them to your cart.</p>
        </div>
        <button className="primary-button" onClick={onViewCart}>
          View cart · {cartCount}
        </button>
      </div>
      {menu.length ? (
        <div className="menu-list">
          {menu.map(item => (
            <article className="menu-item storefront-menu-item" key={item.id}>
              <div className="dish-icon">
                {item.name.toLowerCase().includes('soup')
                  ? '🍲'
                  : item.name.toLowerCase().includes('duck') || item.name.toLowerCase().includes('chicken')
                    ? '🍗'
                    : item.name.toLowerCase().includes('dumpling')
                      ? '🥟'
                      : '🍜'}
              </div>
              <div className="dish-description">
                <strong>{item.name}</strong>
                <span>{item.status === 'available' ? 'Made fresh to order' : 'Currently sold out'}</span>
              </div>
              <div className="menu-action">
                <b>{formatMoney(item.price)}</b>
                <button
                  className="small-button"
                  disabled={item.status !== 'available' || busy !== null}
                  onClick={() => onAddToCart(item)}
                >
                  {cart[item.id] ? `Add more (${cart[item.id]})` : 'Add to cart +'}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty">This restaurant hasn’t added menu items yet.</p>
      )}
    </section>
  );
}
