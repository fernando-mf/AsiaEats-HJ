import type { AccountCreationRequest, LoginRequest } from '#domain/reg/index.js';
import type { AccountResponse, LoginResponse } from '#application/controllers/responses.dto.js';
import type { HttpClient } from './api.ts';

export class AccountsClient {
  constructor(private readonly http: HttpClient) {}

  create(request: AccountCreationRequest): Promise<AccountResponse> {
    return this.http.request('POST', '/auth/register', request);
  }

  async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await this.http.request<LoginResponse>('POST', '/auth/login', request);
    this.http.accessToken = response.accessToken;
    return response;
  }

  me(): Promise<AccountResponse> {
    return this.http.request('GET', '/auth/me');
  }
}
