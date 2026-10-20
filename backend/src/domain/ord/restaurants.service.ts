import { Injectable } from '@nestjs/common';
import { validate } from 'class-validator';
import { EventsService } from '#domain/events/index.js';
import { ForbiddenError, InvalidParamsError } from '#domain/errors.js';
import { AccountRole, type Actor } from '#domain/reg/index.js';
import {
  Restaurant,
  RestaurantCreatedEvent,
  RestaurantCreationRequest,
  RestaurantStatus,
  RestaurantUpdatedEvent,
  RestaurantUpdateRequest,
} from './restaurants.models.js';

export abstract class RestaurantRepository {
  abstract create(restaurant: Restaurant): Promise<Restaurant>;
  abstract update(restaurant: Restaurant): Promise<Restaurant>;
  abstract getById(id: string): Promise<Restaurant>;
  abstract getByOwnerId(ownerId: string): Promise<Restaurant>;
}

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly repository: RestaurantRepository,
    private readonly events: EventsService,
  ) {}

  async create(actor: Actor, request: RestaurantCreationRequest): Promise<Restaurant> {
    const errors = await validate(request);
    if (errors.length > 0) {
      throw InvalidParamsError.fromClassValidator(errors);
    }

    const now = new Date();

    const restaurant = new Restaurant();
    restaurant.ownerId = actor.id;
    restaurant.name = request.name;
    restaurant.status = request.status ?? RestaurantStatus.Closed;
    restaurant.position = {
      latitude: request.position.latitude,
      longitude: request.position.longitude,
    };
    restaurant.createdAt = now;
    restaurant.updatedAt = now;

    const created = await this.repository.create(restaurant);

    await this.events.publish(
      new RestaurantCreatedEvent({
        entityId: created.id,
        payload: created,
        actor,
      }),
    );

    return created;
  }

  async update(actor: Actor, id: string, request: RestaurantUpdateRequest): Promise<Restaurant> {
    const errors = await validate(request, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) {
      throw InvalidParamsError.fromClassValidator(errors);
    }

    const restaurant = await this.repository.getById(id);

    if (actor.role !== AccountRole.Operator && actor.id !== restaurant.ownerId) {
      throw new ForbiddenError('cannot update a restaurant you do not own');
    }

    restaurant.name = request.name;
    restaurant.position = request.position;
    restaurant.updatedAt = new Date();

    const updated = await this.repository.update(restaurant);

    await this.events.publish(
      new RestaurantUpdatedEvent({
        entityId: updated.id,
        payload: updated,
        actor,
      }),
    );

    return updated;
  }
}
