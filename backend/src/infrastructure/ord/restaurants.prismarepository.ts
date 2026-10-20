import { Injectable } from '@nestjs/common';
import { DuplicateEntityError, InternalError, NotFoundError } from '#domain/errors.js';
import { MenuItem, MenuItemStatus, Restaurant, RestaurantRepository, RestaurantStatus } from '#domain/ord/index.js';
import { PrismaService } from '#infrastructure/prisma.service.js';

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

      return toRestaurantModel(row);
    } catch (err) {
      if (this.db.isUniqueViolation(err)) {
        throw new DuplicateEntityError('restaurant');
      }
      throw new InternalError(err as Error);
    }
  }

  async createMenuItem(menuItem: MenuItem): Promise<MenuItem> {
    try {
      const row = await this.db.menuItem.create({
        data: {
          restaurantId: menuItem.restaurantId,
          name: menuItem.name,
          price: menuItem.price,
          status: menuItem.status,
          createdAt: menuItem.createdAt,
          updatedAt: menuItem.updatedAt,
        },
      });

      return toMenuItemModel(row);
    } catch (err) {
      if (this.db.isForeignKeyViolation(err)) {
        throw new NotFoundError('restaurant');
      }
      throw new InternalError(err as Error);
    }
  }

  async getMenuItem(restaurantId: string, itemId: string): Promise<MenuItem> {
    const row = await this.db.menuItem.findFirst({ where: { id: itemId, restaurantId } });
    if (!row) {
      throw new NotFoundError('menu item');
    }

    return toMenuItemModel(row);
  }

  async updateMenuItem(menuItem: MenuItem): Promise<MenuItem> {
    try {
      const row = await this.db.menuItem.update({
        where: { id: menuItem.id },
        data: {
          name: menuItem.name,
          price: menuItem.price,
          status: menuItem.status,
          updatedAt: menuItem.updatedAt,
        },
      });

      return toMenuItemModel(row);
    } catch (err) {
      throw new InternalError(err as Error);
    }
  }

  async getById(id: string): Promise<Restaurant> {
    const row = await this.db.restaurant.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundError('restaurant');
    }

    return toRestaurantModel(row);
  }

  async update(restaurant: Restaurant): Promise<Restaurant> {
    try {
      const row = await this.db.restaurant.update({
        where: { id: restaurant.id },
        data: {
          name: restaurant.name,
          latitude: restaurant.position.latitude,
          longitude: restaurant.position.longitude,
          updatedAt: restaurant.updatedAt,
        },
      });

      return toRestaurantModel(row);
    } catch (err) {
      throw new InternalError(err as Error);
    }
  }

  async updateStatus(restaurant: Restaurant): Promise<Restaurant> {
    try {
      const row = await this.db.restaurant.update({
        where: { id: restaurant.id },
        data: {
          status: restaurant.status,
          updatedAt: restaurant.updatedAt,
        },
      });

      return toRestaurantModel(row);
    } catch (err) {
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

      return toRestaurantModel(row);
    } catch (err) {
      throw new InternalError(err as Error);
    }
  }
}

function toRestaurantModel(row: {
  id: string;
  ownerId: string;
  name: string;
  status: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
  updatedAt: Date;
}): Restaurant {
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    status: row.status as RestaurantStatus,
    position: { latitude: row.latitude, longitude: row.longitude },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toMenuItemModel(row: {
  id: string;
  restaurantId: string;
  name: string;
  price: { toNumber(): number };
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): MenuItem {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    name: row.name,
    price: row.price.toNumber(),
    status: row.status as MenuItemStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
