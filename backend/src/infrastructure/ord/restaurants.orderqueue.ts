import { Injectable } from '@nestjs/common';
import { RestaurantOrderQueue } from '#domain/ord/index.js';

// TODO: the orders table does not exist yet. Once it does, count the restaurant's orders
// with status placed, accepted or preparing.
@Injectable()
export class PrismaRestaurantOrderQueue extends RestaurantOrderQueue {
  async countPending(_restaurantId: string): Promise<number> {
    return 0;
  }
}
