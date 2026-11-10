import type { CourierPositionUpdateRequest, CourierStatus } from '#domain/reg/index.js';
import type { CourierResponse, CourierSummaryResponse } from '#application/controllers/responses.dto.js';
import type { HttpClient } from './api.ts';

export class CouriersClient {
  constructor(private readonly http: HttpClient) {}

  list(status?: CourierStatus | string): Promise<CourierSummaryResponse[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.http.request('GET', `/couriers${query}`);
  }

  me(): Promise<CourierResponse> {
    return this.http.request('GET', '/couriers/me');
  }

  updatePosition(request: CourierPositionUpdateRequest): Promise<CourierResponse> {
    return this.http.request('PUT', '/couriers/me/position', request);
  }
}
