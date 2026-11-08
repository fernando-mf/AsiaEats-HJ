import { describe, expect, it } from 'vitest';
import { api } from '../client/api.ts';

describe('GET /status', () => {
  it('reports the API is up', async () => {
    const body = await api.request('GET', '/status');

    expect(body.status).toBe('ok');
    expect(body.datetime).not.toBeNaN();
  });
});
