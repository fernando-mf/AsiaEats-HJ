const API_BASE_PATH = '/api';

type ErrorPayload = {
  code?: unknown;
  [key: string]: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: ErrorPayload;

  constructor(status: number, payload?: ErrorPayload) {
    super('The API request was not successful.');
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

  if (!contentType?.includes('application/json')) {
    return undefined;
  }

  return response.json();
}

export async function postJson<TResult = unknown>(path: string, body: unknown): Promise<TResult> {
  const response = await fetch(`${API_BASE_PATH}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await parseJson(response);

  if (!response.ok) {
    throw new ApiError(response.status, isErrorPayload(payload) ? payload : undefined);
  }

  return payload as TResult;
}
