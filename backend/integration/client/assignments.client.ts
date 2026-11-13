import type { Assignment } from '#domain/dlv/index.js';
import type { HttpClient } from './api.ts';

export class AssignmentsClient {
  constructor(private readonly http: HttpClient) {}

  accept(id: string): Promise<Assignment> {
    return this.http.request('POST', `/order-assignments/${id}/accept`);
  }
}
