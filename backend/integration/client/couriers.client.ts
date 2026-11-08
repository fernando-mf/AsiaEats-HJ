import type { CourierResponse } from '#application/controllers/responses.dto.js';
import type { HttpClient } from './api.ts';

export class CouriersClient {
  constructor(private readonly http: HttpClient) {}

  me(): Promise<CourierResponse> {
    return this.http.request('GET', '/couriers/me');
  }
}
