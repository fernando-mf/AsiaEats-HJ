import { describe, expect, it, vi } from 'vitest';
import { InvalidParamsError } from '#domain/errors.js';
import type { OrdersService, RestaurantsService } from '#domain/ord/index.js';
import { AccountRole, type AccountsService, type CouriersService, type CustomersService } from '#domain/reg/index.js';
import { TransactionRunner } from '#domain/transactions.js';
import type { EnvSeed } from './env.seed.js';
import { type EnvironmentRepository, EnvService } from './env.service.js';

const seed: EnvSeed = {
  password: 'password123',
  operators: [{ username: 'operator1', name: 'Jon Doe' }],
  couriers: [
    { username: 'courier', name: 'Patrick Courier', position: { latitude: 45.5017, longitude: -73.5673 } },
    { username: 'courier-2', name: 'Second Courier' },
  ],
  customers: [
    {
      username: 'alice',
      name: 'Alice Chen',
      address: { street: '1 Main St', city: 'Montreal', postalCode: 'H3G 1M8', latitude: 45.5, longitude: -73.57 },
    },
  ],
  restaurants: [
    {
      name: 'Golden Dragon',
      status: 'open' as EnvSeed['restaurants'][number]['status'],
      position: { latitude: 45.5, longitude: -73.56 },
      owner: { username: 'golden-dragon', name: 'Owner' },
      menu: [{ name: 'Pork Dumplings', price: 9.5 }],
    },
  ],
};

// A transaction runner that records whether work runs inside it.
class RecordingTransactionRunner extends TransactionRunner {
  active = false;
  runs = 0;

  async run<T>(work: () => Promise<T>): Promise<T> {
    this.runs += 1;
    this.active = true;
    try {
      return await work();
    } finally {
      this.active = false;
    }
  }
}

function newService(loaded: EnvSeed, options: { failOn?: string } = {}) {
  const transactions = new RecordingTransactionRunner();
  const insideTransaction: boolean[] = [];
  const environment = {
    reset: vi.fn(async () => {
      insideTransaction.push(transactions.active);
    }),
  } as unknown as EnvironmentRepository;
  const created: { role: AccountRole; username: string }[] = [];
  const accounts = {
    create: vi.fn(async (request: { role: AccountRole; username: string }) => {
      insideTransaction.push(transactions.active);
      if (request.username === options.failOn) throw new InvalidParamsError([{ field: 'username', messages: [] }]);
      created.push({ role: request.role, username: request.username });
      return { id: `id-${request.username}`, role: request.role };
    }),
  } as unknown as AccountsService;
  const couriers = { updatePosition: vi.fn() } as unknown as CouriersService;
  const customers = { update: vi.fn() } as unknown as CustomersService;
  const restaurants = {
    create: vi.fn(async () => ({ id: 'restaurant-1' })),
    createMenuItem: vi.fn(),
  } as unknown as RestaurantsService;
  const service = new EnvService(
    environment,
    { load: vi.fn(async () => loaded) },
    accounts,
    couriers,
    customers,
    restaurants,
    {} as OrdersService,
    transactions,
  );

  return { service, environment, created, couriers, customers, restaurants, transactions, insideTransaction };
}

describe('EnvService.reset', () => {
  it('empties the database, then creates every seeded account, restaurant and dish', async () => {
    const { service, environment, created, customers, restaurants } = newService(seed);

    await service.reset();

    expect(environment.reset).toHaveBeenCalledOnce();
    expect(created).toEqual([
      { role: AccountRole.Operator, username: 'operator1' },
      { role: AccountRole.Courier, username: 'courier' },
      { role: AccountRole.Courier, username: 'courier-2' },
      { role: AccountRole.Customer, username: 'alice' },
      { role: AccountRole.Restaurant, username: 'golden-dragon' },
    ]);
    expect(customers.update).toHaveBeenCalledOnce();
    expect(restaurants.create).toHaveBeenCalledOnce();
    expect(restaurants.createMenuItem).toHaveBeenCalledOnce();
  });

  it("places a seeded courier at the seed's position, and leaves one without a position unplaced", async () => {
    const { service, couriers } = newService(seed);

    await service.reset();

    expect(couriers.updatePosition).toHaveBeenCalledOnce();
    expect(couriers.updatePosition).toHaveBeenCalledWith(
      { id: 'id-courier', role: AccountRole.Courier },
      expect.objectContaining({ position: { latitude: 45.5017, longitude: -73.5673 } }),
    );
  });

  it('empties and seeds the database inside one transaction', async () => {
    const { service, transactions, insideTransaction } = newService(seed);

    await service.reset();

    expect(transactions.runs).toBe(1);
    expect(insideTransaction.length).toBeGreaterThan(1);
    expect(insideTransaction.every(Boolean)).toBe(true);
  });

  it('propagates a value the services refuse, so the transaction rolls the reset back', async () => {
    const { service, environment, created } = newService(seed, { failOn: 'alice' });

    await expect(service.reset()).rejects.toBeInstanceOf(InvalidParamsError);
    // The tables were emptied and three accounts created inside the transaction that now fails.
    expect(environment.reset).toHaveBeenCalledOnce();
    expect(created).toHaveLength(3);
  });

  it('refuses a seed without an account for every role, before touching the database', async () => {
    const { service, environment, transactions } = newService({ ...seed, couriers: [] });

    await expect(service.reset()).rejects.toBeInstanceOf(InvalidParamsError);
    expect(environment.reset).not.toHaveBeenCalled();
    expect(transactions.runs).toBe(0);
  });
});
