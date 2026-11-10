import { describe, expect, it } from 'vitest';
import { InternalError } from '#domain/errors.js';
import { FileSeedSource, parseSeed } from './seed.filesource.js';

describe('FileSeedSource', () => {
  it('reads the configuration file shipped in backend/config/seed.json', async () => {
    const seed = await new FileSeedSource().load();

    expect(seed.operators.length).toBeGreaterThan(0);
    expect(seed.couriers.length).toBeGreaterThan(0);
    expect(seed.customers.length).toBeGreaterThan(0);
    expect(seed.restaurants.length).toBeGreaterThan(0);
    expect(seed.restaurants.every(restaurant => restaurant.menu.length > 0)).toBe(true);
  });
});

describe('parseSeed', () => {
  const valid = {
    password: 'password123',
    operators: [{ username: 'operator1', name: 'Jon Doe' }],
    couriers: [{ username: 'courier', name: 'Patrick Courier' }],
    customers: [{ username: 'alice', name: 'Alice Chen' }],
    restaurants: [
      {
        name: 'Golden Dragon',
        status: 'open',
        position: { latitude: 45.5, longitude: -73.56 },
        owner: { username: 'golden-dragon', name: 'Owner' },
        menu: [{ name: 'Pork Dumplings', price: 9.5 }],
      },
    ],
  };

  it('returns the seed a valid file describes', () => {
    expect(parseSeed(JSON.stringify(valid), 'seed.json')).toEqual(valid);
  });

  it('refuses a file that is not JSON', () => {
    expect(() => parseSeed('{ not json', 'seed.json')).toThrow(/seed.json is not valid JSON/);
  });

  it('names the part of the file that is wrong', () => {
    const broken = structuredClone(valid);
    (broken.restaurants[0].menu[0] as { price: unknown }).price = 'cheap';

    expect(() => parseSeed(JSON.stringify(broken), 'seed.json')).toThrow(InternalError);
    expect(() => parseSeed(JSON.stringify(broken), 'seed.json')).toThrow(/restaurants\.0\.menu\.0\.price/);
  });

  it('refuses an unknown restaurant status', () => {
    const broken = structuredClone(valid);
    broken.restaurants[0].status = 'busy';

    expect(() => parseSeed(JSON.stringify(broken), 'seed.json')).toThrow(/restaurants\.0\.status/);
  });
});
