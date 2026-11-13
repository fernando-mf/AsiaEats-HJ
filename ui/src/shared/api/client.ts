import { commandName } from '../console/commandNames';
import { logError, logSuccess } from '../console/outputConsole';

const API_BASE_PATH = '/api';
const TOKEN_KEY = 'eatchinese.accessToken';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

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

// NetworkError means the request never got a response, e.g. the backend is not running.
export class NetworkError extends Error {
  constructor() {
    super('Could not reach the server. Make sure the backend is running.');
    this.name = 'NetworkError';
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

const ENTITY_LABELS: Record<string, string> = {
  order: 'Order',
  restaurant: 'Restaurant',
  account: 'Account',
  customer: 'Customer profile',
  'menu item': 'Menu item',
};

function detail(error: ApiError, key: string): string | undefined {
  const value = error.details?.[key];
  return typeof value === 'string' && value ? value : undefined;
}

function sentence(text: string): string {
  const trimmed = text.trim();
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

function readableState(state: string): string {
  return state.replace(/_/g, ' ');
}

function fieldMessages(error: ApiError): string[] {
  const errors = error.details?.errors;
  if (!Array.isArray(errors)) return [];

  return errors.flatMap(entry =>
    isErrorPayload(entry) && Array.isArray(entry.messages)
      ? entry.messages.filter((message): message is string => typeof message === 'string')
      : [],
  );
}

export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const entityLabel = ENTITY_LABELS[detail(error, 'entityType') ?? ''];

    switch (error.code) {
      case 'forbidden':
        return 'Your account role is not allowed to perform that command.';
      case 'unauthenticated':
        return 'Your session is missing or expired. Please sign in again.';
      case 'not_found':
        return entityLabel ? `${entityLabel} not found.` : 'The requested resource was not found.';
      case 'duplicate_entity':
        return entityLabel ? `${entityLabel} already exists.` : 'That record already exists.';
      case 'restaurant_not_open': {
        const status = detail(error, 'restaurantStatus');
        return status
          ? `Restaurant is ${readableState(status)} and is not accepting orders.`
          : 'Restaurant is not accepting orders.';
      }
      case 'menu_item_sold_out':
        return 'An item in your order is sold out.';
      case 'menu_item_not_in_menu':
        return "An item is not on this restaurant's menu.";
      case 'conflict': {
        const reason = detail(error, 'reason');
        return reason ? sentence(reason) : 'That command is not valid for the current order state.';
      }
      case 'invalid_order_transition': {
        const from = detail(error, 'from');
        const to = detail(error, 'to');
        return from && to
          ? `Cannot move this order from ${readableState(from)} to ${readableState(to)}.`
          : 'That command is not valid for the current order state.';
      }
      case 'invalid_courier_transition': {
        const from = detail(error, 'from');
        const to = detail(error, 'to');
        if (from === 'carrying' && to === 'offline')
          return 'You cannot go off duty while carrying an order. Deliver it first.';
        return from && to
          ? `Cannot change your courier status from ${readableState(from)} to ${readableState(to)}.`
          : 'That duty change is not allowed for your current courier status.';
      }
      case 'invalid_params': {
        const messages = fieldMessages(error);
        return messages.length
          ? `Some of the submitted data is invalid: ${messages.slice(0, 3).join('; ')}.`
          : 'Some of the submitted data is invalid.';
      }
      case 'internal':
        return 'Something went wrong on the server. Please try again.';
      default:
        return error.message;
    }
  }

  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}

// requestJson calls the API and records the outcome in the output console.
// Only the command name, status and error are logged: never tokens or request bodies.
export async function requestJson<TResult = unknown>(
  path: string,
  options: { method?: Method; body?: unknown } = {},
): Promise<TResult> {
  const method = options.method ?? 'GET';
  const command = commandName(method, path);
  const read = method === 'GET';
  const token = getAccessToken();
  const headers: HeadersInit = { Accept: 'application/json' };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_PATH}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    const error = new NetworkError();
    logError(command, error.message, 'network', read);
    throw error;
  }

  let payload: unknown;
  try {
    payload = await parseJson(response);
  } catch (error) {
    if (response.ok) {
      logError(command, 'The server returned a response that could not be read.', 'invalid_response', read);
      throw error;
    }
  }

  if (!response.ok) {
    const error = new ApiError(response.status, isErrorPayload(payload) ? payload : undefined);
    logError(command, apiErrorMessage(error), error.code ?? `http_${response.status}`, read);
    throw error;
  }

  logSuccess(command, `Succeeded (HTTP ${response.status})`, read);
  return payload as TResult;
}

export function postJson<TResult = unknown>(path: string, body: unknown): Promise<TResult> {
  return requestJson<TResult>(path, { method: 'POST', body });
}
