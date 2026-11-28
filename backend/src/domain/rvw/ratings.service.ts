import { Injectable } from '@nestjs/common';
import { validate } from 'class-validator';
import { DeliveryService } from '#domain/dlv/index.js';
import { ConflictError, DuplicateEntityError, ForbiddenError, InvalidParamsError } from '#domain/errors.js';
import { OrdersService, OrderStatus } from '#domain/ord/index.js';
import type { Actor } from '#domain/reg/index.js';
import { Rating, type RatingRequest } from './ratings.models.js';

export abstract class RatingRepository {
  abstract create(rating: Rating): Promise<Rating>;
  abstract findByOrder(orderId: string): Promise<Rating | undefined>;
}

@Injectable()
export class RatingsService {
  constructor(
    private readonly repository: RatingRepository,
    private readonly orders: OrdersService,
    private readonly delivery: DeliveryService,
  ) {}

  async rate(actor: Actor, orderId: string, request: RatingRequest): Promise<Rating> {
    const errors = await validate(request);
    if (errors.length > 0) {
      throw InvalidParamsError.fromClassValidator(errors);
    }

    const order = await this.orders.getForDispatch(orderId);
    if (order.customerId !== actor.id) {
      throw new ForbiddenError('only the customer who placed the order can rate it');
    }
    if (order.status !== OrderStatus.Delivered) {
      throw new ConflictError('only a delivered order can be rated');
    }
    if (await this.repository.findByOrder(order.id)) {
      throw new ConflictError('this order has already been rated');
    }

    const assignment = await this.delivery.findAssignmentByOrderId(order.id);
    if (!assignment?.courierId) {
      throw new ConflictError('the order has no courier to rate');
    }

    const rating = new Rating();
    rating.orderId = order.id;
    rating.restaurantId = order.restaurantId;
    rating.courierId = assignment.courierId;
    rating.restaurantRating = request.restaurantRating;
    rating.courierRating = request.courierRating;
    rating.createdAt = new Date();

    return await this.repository.create(rating);
  }
}
