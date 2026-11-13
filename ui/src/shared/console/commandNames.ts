type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

const ID = '[^/]+';

// Mirrors the backend command classes (backend/src/application/commands) so the
// output console uses the same names as the Command pattern on the server.
const routes: Array<[Method, RegExp, string]> = [
  ['POST', /^\/auth\/login$/, 'LoginCommand'],
  ['POST', /^\/auth\/register$/, 'CreateAccountCommand'],
  ['GET', /^\/auth\/me$/, 'GetMeCommand'],
  ['PUT', /^\/accounts\/me$/, 'UpdateAccountCommand'],
  ['PUT', /^\/accounts\/me\/password$/, 'ChangePasswordCommand'],
  ['GET', /^\/customers\/me$/, 'GetCustomerCommand'],
  ['PUT', /^\/customers\/me$/, 'UpdateCustomerCommand'],
  ['GET', /^\/couriers\/me$/, 'GetCourierCommand'],
  ['POST', /^\/couriers\/me\/online$/, 'CourierGoOnlineCommand'],
  ['POST', /^\/couriers\/me\/offline$/, 'CourierGoOfflineCommand'],
  ['GET', /^\/couriers\/me\/assignment$/, 'GetCurrentAssignmentCommand'],
  ['POST', new RegExp(`^/order-assignments/${ID}/accept$`), 'AcceptAssignmentCommand'],
  ['POST', new RegExp(`^/order-assignments/${ID}/decline$`), 'DeclineAssignmentCommand'],
  ['POST', new RegExp(`^/order-assignments/${ID}/pickup$`), 'PickUpAssignmentCommand'],
  ['POST', new RegExp(`^/order-assignments/${ID}/deliver$`), 'DeliverAssignmentCommand'],
  ['GET', /^\/restaurants$/, 'FindRestaurantsCommand'],
  ['POST', /^\/restaurants$/, 'CreateRestaurantCommand'],
  ['PUT', new RegExp(`^/restaurants/${ID}$`), 'UpdateRestaurantCommand'],
  ['PUT', new RegExp(`^/restaurants/${ID}/status$`), 'UpdateRestaurantStatusCommand'],
  ['GET', new RegExp(`^/restaurants/${ID}/menu$`), 'GetMenuCommand'],
  ['GET', new RegExp(`^/restaurants/${ID}/preparation-queue$`), 'GetPreparationQueueCommand'],
  ['POST', new RegExp(`^/restaurants/${ID}/menu-items$`), 'CreateMenuItemCommand'],
  ['PUT', new RegExp(`^/restaurants/${ID}/menu-items/${ID}$`), 'UpdateMenuItemCommand'],
  ['DELETE', new RegExp(`^/restaurants/${ID}/menu-items/${ID}$`), 'DeleteMenuItemCommand'],
  ['POST', /^\/orders$/, 'PlaceOrderCommand'],
  ['GET', /^\/orders$/, 'FindOrdersCommand'],
  ['GET', new RegExp(`^/orders/${ID}$`), 'GetOrderCommand'],
  ['POST', new RegExp(`^/orders/${ID}/accept$`), 'AcceptOrderCommand'],
  ['POST', new RegExp(`^/orders/${ID}/reject$`), 'RejectOrderCommand'],
  ['POST', new RegExp(`^/orders/${ID}/prepare$`), 'StartPreparingCommand'],
  ['POST', new RegExp(`^/orders/${ID}/ready$`), 'MarkOrderReadyCommand'],
  ['POST', new RegExp(`^/orders/${ID}/cancel$`), 'CancelOrderCommand'],
  ['POST', /^\/env\/reset$/, 'ResetEnvCommand'],
  ['GET', /^\/events$/, 'GetEventsByEntityCommand'],
];

// commandName returns the backend command name for a request, or "METHOD /path"
// when the route is unknown. Query strings are never included.
export function commandName(method: Method, path: string): string {
  const pathname = path.split('?')[0];
  const match = routes.find(([routeMethod, pattern]) => routeMethod === method && pattern.test(pathname));
  return match ? match[2] : `${method} ${pathname}`;
}
