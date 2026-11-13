import type { Assignment, AssignmentSearchRequest } from '#domain/dlv/index.js';
import type { HttpClient } from './api.ts';

export class AssignmentsClient {
  constructor(private readonly http: HttpClient) {}

  list(filter: AssignmentSearchRequest = {}): Promise<Assignment[]> {
    const params = new URLSearchParams();
    if (filter.status) params.set('status', filter.status);
    if (filter.courierId) params.set('courierId', filter.courierId);
    const query = params.size ? `?${params}` : '';
    return this.http.request('GET', `/order-assignments${query}`);
  }

  decline(id: string): Promise<Assignment> {
    return this.http.request('POST', `/order-assignments/${id}/decline`);
  }

  pickUp(id: string): Promise<Assignment> {
    return this.http.request('POST', `/order-assignments/${id}/pickup`);
  }

  accept(id: string): Promise<Assignment> {
    return this.http.request('POST', `/order-assignments/${id}/accept`);
  }
}
