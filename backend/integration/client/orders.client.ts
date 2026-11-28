import type { Order, OrderPlacementRequest, OrderRejectionRequest } from '#domain/ord/index.js';
import type { Rating, RatingRequest } from '#domain/rvw/index.js';
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

  reject(id: string, request: OrderRejectionRequest): Promise<Order> {
    return this.http.request('POST', `/orders/${id}/reject`, request);
  }

  refund(id: string): Promise<Order> {
    return this.http.request('POST', `/orders/${id}/refund`);
  }

  cancel(id: string): Promise<Order> {
    return this.http.request('POST', `/orders/${id}/cancel`);
  }

  rate(id: string, request: RatingRequest): Promise<Rating> {
    return this.http.request('POST', `/orders/${id}/rating`, request);
  }
}
