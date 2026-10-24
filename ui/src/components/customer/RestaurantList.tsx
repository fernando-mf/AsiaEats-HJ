import type { Order, Restaurant } from '../dashboard/dashboard.types';
import { OrderHistory } from './OrderHistory';

type RestaurantListProps = {
  restaurants: Restaurant[];
  recentOrders: Order[];
  busy: string | null;
  onRefresh: () => void;
  onSelectRestaurant: (restaurantId: string) => void;
  onViewAllOrders: () => void;
};

export function RestaurantList({
  restaurants,
  recentOrders,
  busy,
  onRefresh,
  onSelectRestaurant,
  onViewAllOrders,
}: RestaurantListProps) {
  return (
    <>
      <section className="welcome-banner">
        <p className="eyebrow">YOUR NEXT FAVOURITE MEAL</p>
        <h1>Cravings? We’ve got you.</h1>
        <p>Explore local flavours and find something delicious today.</p>
      </section>
      <section className="panel storefront-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">EXPLORE</p>
            <h2>All restaurants</h2>
            <p className="muted">Choose a restaurant to discover its full menu.</p>
          </div>
          <button className="secondary-button" onClick={onRefresh} disabled={busy !== null}>
            Refresh
          </button>
        </div>
        {restaurants.length ? (
          <div className="restaurant-grid storefront-grid">
            {restaurants.map((restaurant, index) => (
              <button
                className="restaurant-card storefront-card"
                key={restaurant.id}
                onClick={() => onSelectRestaurant(restaurant.id)}
              >
                <span className={`restaurant-art art-${index % 5}`}>{['🥢', '🍜', '🥟', '🍚', '🍲'][index % 5]}</span>
                <span className={`restaurant-status status-${restaurant.status}`}>
                  <i />
                  {restaurant.status}
                </span>
                <strong>{restaurant.name}</strong>
                <span className="restaurant-card-caption">
                  Explore menu <b>→</b>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="empty">No restaurants are listed yet. Try refreshing in a moment.</p>
        )}
      </section>
      <section className="panel order-history-preview">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">YOUR ACTIVITY</p>
            <h2>Recent orders</h2>
          </div>
          <button className="text-button" onClick={onViewAllOrders}>
            View all →
          </button>
        </div>
        <OrderHistory orders={recentOrders} restaurants={restaurants} />
      </section>
    </>
  );
}
