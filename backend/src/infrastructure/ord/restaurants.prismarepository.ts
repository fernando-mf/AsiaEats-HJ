import { Injectable } from '@nestjs/common';
import { Restaurant, RestaurantRepository } from '#domain/ord/index.js';
import { PrismaService } from '../prisma.service.js';

// TODO: implement
@Injectable()
export class PrismaRestaurantRepository extends RestaurantRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }

  create(restaurant: Restaurant): Promise<Restaurant> {
    return Promise.resolve(restaurant);
  }

  findByOwner(_ownerId: string): Promise<Restaurant | null> {
    return Promise.resolve(null);
  }
}
