import type {
  MenuItem,
  MenuItemCreationRequest,
  Restaurant,
  RestaurantCreationRequest,
  RestaurantSearchResult,
} from '#domain/ord/index.js';
import type { HttpClient } from './api.ts';

export class RestaurantsClient {
  constructor(private readonly http: HttpClient) {}

  create(request: RestaurantCreationRequest): Promise<Restaurant> {
    return this.http.request('POST', '/restaurants', request);
  }

  createMenuItem(restaurantId: string, request: MenuItemCreationRequest): Promise<MenuItem> {
    return this.http.request('POST', `/restaurants/${restaurantId}/menu-items`, request);
  }

  find(): Promise<RestaurantSearchResult[]> {
    return this.http.request('GET', '/restaurants');
  }
}
