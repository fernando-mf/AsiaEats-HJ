import type { CustomerUpdateRequest } from '#domain/reg/index.js';
import type { CustomerResponse } from '#application/controllers/responses.dto.js';
import type { HttpClient } from './api.ts';

export class CustomersClient {
  constructor(private readonly http: HttpClient) {}

  update(request: CustomerUpdateRequest): Promise<CustomerResponse> {
    return this.http.request('PUT', '/customers/me', request);
  }
}
