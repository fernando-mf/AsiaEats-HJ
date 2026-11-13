import { AccountsClient } from './accounts.client.ts';
import { AssignmentsClient } from './assignments.client.ts';
import { CouriersClient } from './couriers.client.ts';
import { CustomersClient } from './customers.client.ts';
import { OrdersClient } from './orders.client.ts';
import { RestaurantsClient } from './restaurants.client.ts';
import { HttpClient } from './api.ts';

export class Client {
  private readonly http = new HttpClient();

  readonly accounts = new AccountsClient(this.http);
  readonly assignments = new AssignmentsClient(this.http);
  readonly couriers = new CouriersClient(this.http);
  readonly customers = new CustomersClient(this.http);
  readonly orders = new OrdersClient(this.http);
  readonly restaurants = new RestaurantsClient(this.http);
}
