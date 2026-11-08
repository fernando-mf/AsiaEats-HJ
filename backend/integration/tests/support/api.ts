export const BASE_URL = (process.env.API_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');

type RequestOptions = {
  body?: unknown;
  token?: string;
};

export type ApiResponse<T = any> = {
  status: number;
  body: T;
};

async function request<T = any>(method: string, path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (options.token) headers.authorization = `Bearer ${options.token}`;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  return { status: response.status, body: (text ? JSON.parse(text) : undefined) as T };
}

export const api = {
  get: <T = any>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T = any>(path: string, options?: RequestOptions) => request<T>('POST', path, options),
  put: <T = any>(path: string, options?: RequestOptions) => request<T>('PUT', path, options),
  patch: <T = any>(path: string, options?: RequestOptions) => request<T>('PATCH', path, options),
  delete: <T = any>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
};

// Unique values keep tests independent from existing data, so the suite is safe on a shared server.
export function unique(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
