import { Injectable } from '@nestjs/common';
import { InvalidParamsError } from '#domain/errors.js';
import {
  MenuItemCreationRequest,
  OrdersService,
  RestaurantCreationRequest,
  RestaurantsService,
} from '#domain/ord/index.js';
import {
  AccountCreationRequest,
  AccountRole,
  AccountsService,
  CustomersService,
  CustomerUpdateRequest,
} from '#domain/reg/index.js';
import { TransactionRunner } from '#domain/transactions.js';
import { type EnvSeed, type SeedAccount, SeedSource } from './env.seed.js';

export abstract class EnvironmentRepository {
  abstract reset(): Promise<void>;
}

@Injectable()
export class EnvService {
  constructor(
    private readonly environment: EnvironmentRepository,
    private readonly seedSource: SeedSource,
    private readonly accounts: AccountsService,
    private readonly customers: CustomersService,
    private readonly restaurants: RestaurantsService,
    private readonly orders: OrdersService,
    private readonly transactions: TransactionRunner,
  ) {}

  // reset empties the database and loads the seed again. The seed's structure is checked
  // first, and emptying and seeding run as one transaction, so a value the services refuse
  // (a duplicate username, a negative price) rolls everything back instead of leaving the
  // database half seeded. Run from a command, it joins the command's transaction; run from
  // the seed script, it opens its own.
  async reset(): Promise<void> {
    const seed = await this.seedSource.load();
    assertEveryRoleSeeded(seed);

    await this.transactions.run(async () => {
      await this.environment.reset();
      await this.seed(seed);
    });
  }

  // Every seeded record goes through the same services, and so the same validation, as the API.
  private async seed(seed: EnvSeed): Promise<void> {
    const account = (role: AccountRole, { username, name }: SeedAccount) =>
      AccountCreationRequest.initialize({ role, username, name, password: seed.password });

    for (const operator of seed.operators) {
      await this.accounts.create(account(AccountRole.Operator, operator));
    }

    for (const courier of seed.couriers) {
      await this.accounts.create(account(AccountRole.Courier, courier));
    }

    for (const customer of seed.customers) {
      const created = await this.accounts.create(account(AccountRole.Customer, customer));
      if (customer.address) {
        await this.customers.update(created, CustomerUpdateRequest.initialize({ address: customer.address }));
      }
    }

    for (const restaurant of seed.restaurants) {
      const owner = await this.accounts.create(account(AccountRole.Restaurant, restaurant.owner));
      const created = await this.restaurants.create(
        owner,
        RestaurantCreationRequest.initialize({
          name: restaurant.name,
          status: restaurant.status,
          position: restaurant.position,
        }),
      );

      for (const item of restaurant.menu) {
        await this.restaurants.createMenuItem(owner, created.id, MenuItemCreationRequest.initialize(item));
      }
    }
  }
}

// R-REG-03: the seed holds at least one account per role, so every role can be demonstrated.
function assertEveryRoleSeeded(seed: EnvSeed): void {
  const counts: Record<string, number> = {
    operators: seed.operators.length,
    couriers: seed.couriers.length,
    customers: seed.customers.length,
    restaurants: seed.restaurants.length,
  };
  const missing = Object.entries(counts).filter(([, count]) => count === 0);
  if (missing.length > 0) {
    throw new InvalidParamsError(
      missing.map(([field]) => ({ field, messages: [`the seed must contain at least one of ${field}`] })),
    );
  }
}
