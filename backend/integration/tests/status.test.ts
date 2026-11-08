import { describe, expect, it } from 'vitest';
import { api } from './support/api.js';

describe('GET /status', () => {
  it('reports the API is up', async () => {
    const res = await api.get('/status');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(Number.isNaN(Date.parse(res.body.datetime))).toBe(false);
  });
});
