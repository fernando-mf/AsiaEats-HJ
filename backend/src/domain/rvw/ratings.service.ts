import { Injectable } from '@nestjs/common';
import { validate } from 'class-validator';
import { InvalidParamsError } from '#domain/errors.js';
import { Rating, type RatingRequest } from './ratings.models.js';

export abstract class RatingRepository {
  abstract create(rating: Rating): Promise<Rating>;
  abstract findByOrder(orderId: string): Promise<Rating | undefined>;
}

@Injectable()
export class RatingsService {
  constructor(private readonly repository: RatingRepository) {}

  async record(
    order: { id: string; restaurantId: string; courierId: string },
    request: RatingRequest,
  ): Promise<Rating> {
    const errors = await validate(request);
    if (errors.length > 0) {
      throw InvalidParamsError.fromClassValidator(errors);
    }

    const rating = new Rating();
    rating.orderId = order.id;
    rating.restaurantId = order.restaurantId;
    rating.courierId = order.courierId;
    rating.restaurantRating = request.restaurantRating;
    rating.courierRating = request.courierRating;
    rating.createdAt = new Date();
    return this.repository.create(rating);
  }

  findByOrder(orderId: string): Promise<Rating | undefined> {
    return this.repository.findByOrder(orderId);
  }
}
