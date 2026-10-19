import { Injectable } from '@nestjs/common';
import { DuplicateEntityError, InternalError, NotFoundError } from '#domain/errors.js';
import { Restaurant, RestaurantRepository, RestaurantStatus } from '#domain/ord/index.js';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class PrismaRestaurantRepository extends RestaurantRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }

  async create(restaurant: Restaurant): Promise<Restaurant> {
    try {
      const row = await this.db.restaurant.create({
        data: {
          ownerId: restaurant.ownerId,
          name: restaurant.name,
          status: restaurant.status,
          latitude: restaurant.position.latitude,
          longitude: restaurant.position.longitude,
          createdAt: restaurant.createdAt,
          updatedAt: restaurant.updatedAt,
        },
      });

      restaurant.id = row.id;

      return restaurant;
    } catch (err) {
      if (this.db.isUniqueViolation(err)) {
        throw new DuplicateEntityError('restaurant');
      }
      throw new InternalError(err as Error);
    }
  }

  async getByOwnerId(ownerId: string): Promise<Restaurant> {
    try {
      const row = await this.db.restaurant.findFirst({
        where: { ownerId },
        orderBy: [{ createdAt: 'asc' }],
        take: 1,
      });

      if (!row) {
        throw new NotFoundError('restaurant');
      }

      return {
        id: row.id,
        ownerId: row.ownerId,
        name: row.name,
        status: row.status as RestaurantStatus,
        position: {
          latitude: row.latitude,
          longitude: row.longitude,
        },
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    } catch (err) {
      throw new InternalError(err as Error);
    }
  }
}
