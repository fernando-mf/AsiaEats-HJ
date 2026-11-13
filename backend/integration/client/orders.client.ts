import type { Order, OrderPlacementRequest } from '#domain/ord/index.js';
import type { HttpClient } from './api.ts';

export class OrdersClient {
  constructor(private readonly http: HttpClient) {}

  place(request: OrderPlacementRequest): Promise<Order> {
    return this.http.request('POST', '/orders', request);
  }

  accept(id: string): Promise<Order> {
    return this.http.request('POST', `/orders/${id}/accept`);
  }

  prepare(id: string): Promise<Order> {
    return this.http.request('POST', `/orders/${id}/prepare`);
  }

  ready(id: string): Promise<Order> {
    return this.http.request('POST', `/orders/${id}/ready`);
  }
}
