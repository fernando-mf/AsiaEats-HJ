const API_BASE_PATH = '/api';
const TOKEN_KEY = 'eatchinese.accessToken';

type ErrorPayload = {
  code?: unknown;
  reason?: unknown;
  errors?: unknown;
  [key: string]: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: ErrorPayload;

  constructor(status: number, payload?: ErrorPayload) {
    super(typeof payload?.reason === 'string' ? payload.reason : 'The API request was not successful.');
    this.name = 'ApiError';
    this.status = status;
    this.code = typeof payload?.code === 'string' ? payload.code : undefined;
    this.details = payload;
  }
}

function isErrorPayload(value: unknown): value is ErrorPayload {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function parseJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) return undefined;
  return response.json();
}

export function getAccessToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'forbidden') return 'Your account role is not allowed to perform that command.';
    if (error.code === 'unauthenticated') return 'Your session is missing or expired. Please sign in again.';
    if (error.code === 'not_found') return 'The requested resource was not found.';
    if (error.code === 'conflict' || error.code === 'invalid_order_transition') return 'That command is not valid for the current order state.';
    if (error.code === 'invalid_params') return 'Some of the submitted data is invalid.';
    return error.message;
  }

  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}

export async function requestJson<TResult = unknown>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown } = {},
): Promise<TResult> {
  const token = getAccessToken();
  const headers: HeadersInit = { Accept: 'application/json' };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_PATH}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    throw new ApiError(response.status, isErrorPayload(payload) ? payload : undefined);
  }

  return payload as TResult;
}

export function postJson<TResult = unknown>(path: string, body: unknown): Promise<TResult> {
  return requestJson<TResult>(path, { method: 'POST', body });
}
