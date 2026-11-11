import { ApplicationError } from '#domain/errors.js';
import type { OrderStatus } from './orders.models.js';
import type { RestaurantStatus } from './restaurants.models.js';

// R-ORD-04: an action the order's current state does not allow, e.g. a skipped state.
export class InvalidOrderTransitionError extends ApplicationError {
  statusCode = 409;
  code = 'invalid_order_transition';

  constructor(
    readonly from: OrderStatus,
    readonly to: OrderStatus,
  ) {
    super(`invalid order transition: ${from} -> ${to}`);
  }
}

export class RestaurantNotOpenError extends ApplicationError {
  statusCode = 409;
  code = 'restaurant_not_open';

  constructor(readonly restaurantStatus: RestaurantStatus) {
    super(`restaurant is not open: ${restaurantStatus}`);
  }
}

export class MenuItemNotInMenuError extends ApplicationError {
  statusCode = 400;
  code = 'menu_item_not_in_menu';

  constructor(readonly menuItemId: string) {
    super(`menu item does not belong to the restaurant's menu: ${menuItemId}`);
  }
}

export class MenuItemSoldOutError extends ApplicationError {
  statusCode = 409;
  code = 'menu_item_sold_out';

  constructor(readonly menuItemId: string) {
    super(`menu item is sold out: ${menuItemId}`);
  }
}
