import type { ErrorResponse } from '#application/controllers/responses.dto.js';
import { HttpStatus } from '@nestjs/common';

export const BASE_URL = (process.env.API_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// short form of our app errors, for test assertions
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly body: unknown,
  ) {
    super(`${status}: ${code}: ${JSON.stringify(body)}`);
  }
}

export class HttpClient {
  accessToken?: string;

  async request<T = any>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {};

    if (body) {
      headers['content-type'] = 'application/json';
    }
    if (this.accessToken) {
      headers.authorization = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const rawError = await response.json();
      if (isAppError(rawError)) {
        throw new ApiError(response.status, rawError.code, rawError);
      }

      throw new Error(`${response.status}: ${response.text()}`);
    }

    if (response.status == HttpStatus.NO_CONTENT) {
      return undefined as T;
    }

    return response.json();
  }
}

// best attempt at trying to identify our custom app errors
function isAppError(value: unknown): value is ErrorResponse {
  return typeof value === 'object' && value !== null && typeof (value as ErrorResponse).code === 'string';
}

export const api = new HttpClient();
