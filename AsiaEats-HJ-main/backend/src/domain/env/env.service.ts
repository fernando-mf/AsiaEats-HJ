import { Injectable } from '@nestjs/common';
import { OrdersService, RestaurantsService } from '#domain/ord/index.js';
import { AccountsService, CustomersService } from '#domain/reg/index.js';
import { seedCouriers, seedCustomers, seedOperators, seedRestaurants } from './env.seed.js';

export abstract class EnvironmentRepository {
  abstract reset(): Promise<void>;
}

@Injectable()
export class EnvService {
  constructor(
    private readonly environment: EnvironmentRepository,
    private readonly accounts: AccountsService,
    private readonly customers: CustomersService,
    private readonly restaurants: RestaurantsService,
    private readonly orders: OrdersService,
  ) {}

  async reset(): Promise<void> {
    await this.environment.reset();
    await this.seed();
  }

  private async seed(): Promise<void> {
    //
    // Seed operators
    //
    for (const request of seedOperators) {
      await this.accounts.create(request);
    }

    //
    // Seed couriers
    //
    for (const request of seedCouriers) {
      await this.accounts.create(request);
    }

    //
    // Seed customers and their profiles
    //
    for (const seed of seedCustomers) {
      const customer = await this.accounts.create(seed.account);
      if (seed.customerProfile) {
        await this.customers.update(customer, seed.customerProfile);
      }
    }

    //
    // Seed restaurant accounts, their restaurants, and their menus
    //
    for (const seed of seedRestaurants) {
      const owner = await this.accounts.create(seed.owner);
      const restaurant = await this.restaurants.create(owner, seed.restaurant);

      for (const item of seed.menu) {
        await this.restaurants.createMenuItem(owner, restaurant.id, item);
      }
    }
  }
}
