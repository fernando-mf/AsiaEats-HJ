import { Injectable } from '@nestjs/common';
import { DuplicateEntityError, InternalError } from '#domain/errors.js';
import { Rating, RatingRepository } from '#domain/rvw/index.js';
import { PrismaService } from '#infrastructure/prisma.service.js';

@Injectable()
export class PrismaRatingRepository extends RatingRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }

  async create(rating: Rating): Promise<Rating> {
    try {
      const row = await this.db.client().rating.create({
        data: {
          orderId: rating.orderId,
          restaurantId: rating.restaurantId,
          courierId: rating.courierId,
          restaurantRating: rating.restaurantRating,
          courierRating: rating.courierRating,
          createdAt: rating.createdAt,
        },
      });
      return toRating(row);
    } catch (err) {
      if (this.db.isUniqueViolation(err)) {
        throw new DuplicateEntityError('rating');
      }
      throw new InternalError(err as Error);
    }
  }

  async findByOrder(orderId: string): Promise<Rating | undefined> {
    const row = await this.db.client().rating.findUnique({ where: { orderId } });
    return row ? toRating(row) : undefined;
  }
}

function toRating(row: {
  id: string;
  orderId: string;
  restaurantId: string;
  courierId: string;
  restaurantRating: number;
  courierRating: number;
  createdAt: Date;
}): Rating {
  const rating = new Rating();
  rating.id = row.id;
  rating.orderId = row.orderId;
  rating.restaurantId = row.restaurantId;
  rating.courierId = row.courierId;
  rating.restaurantRating = row.restaurantRating;
  rating.courierRating = row.courierRating;
  rating.createdAt = row.createdAt;
  return rating;
}
