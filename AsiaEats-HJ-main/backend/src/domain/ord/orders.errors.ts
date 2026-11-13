import { ApplicationError } from '#domain/errors.js';
import type { RestaurantStatus } from './restaurants.models.js';

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
