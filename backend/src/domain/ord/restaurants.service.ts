import { Injectable } from '@nestjs/common';
import { validate } from 'class-validator';
import { EventsService } from '#domain/events/index.js';
import { ConflictError, ForbiddenError, InvalidParamsError } from '#domain/errors.js';
import { AccountRole, type Actor } from '#domain/reg/index.js';
import {
  MenuItem,
  MenuItemCreatedEvent,
  MenuItemCreationRequest,
  MenuItemStatus,
  Restaurant,
  RestaurantCreatedEvent,
  RestaurantCreationRequest,
  RestaurantStatus,
  RestaurantStatusChangedEvent,
  RestaurantStatusUpdateRequest,
  RestaurantUpdatedEvent,
  RestaurantUpdateRequest,
} from './restaurants.models.js';

export abstract class RestaurantRepository {
  abstract create(restaurant: Restaurant): Promise<Restaurant>;
  abstract update(restaurant: Restaurant): Promise<Restaurant>;
  abstract updateStatus(restaurant: Restaurant): Promise<Restaurant>;
  abstract getById(id: string): Promise<Restaurant>;
  abstract getByOwnerId(ownerId: string): Promise<Restaurant>;
  abstract createMenuItem(menuItem: MenuItem): Promise<MenuItem>;
}

// RestaurantOrderQueue gives the restaurant module read access to the orders a restaurant
// is still working on, without depending on the orders implementation.
export abstract class RestaurantOrderQueue {
  // countPending returns the orders in the arrival queue (placed) and the
  // preparation queue (accepted, preparing).
  abstract countPending(restaurantId: string): Promise<number>;
}

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly repository: RestaurantRepository,
    private readonly orderQueue: RestaurantOrderQueue,
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

    const restaurant = await this.getRestaurantEnsuringPermissions(actor, id);

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

  async updateStatus(actor: Actor, id: string, request: RestaurantStatusUpdateRequest): Promise<Restaurant> {
    const errors = await validate(request, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) {
      throw InvalidParamsError.fromClassValidator(errors);
    }

    const restaurant = await this.getRestaurantEnsuringPermissions(actor, id);

    const previousStatus = restaurant.status;
    if (previousStatus === request.status) {
      return restaurant;
    }

    // TODO: implement cannot close restaurant if it has orders in its preparation queue

    restaurant.status = request.status;
    restaurant.updatedAt = new Date();

    const updated = await this.repository.updateStatus(restaurant);

    await this.events.publish(
      new RestaurantStatusChangedEvent({
        entityId: updated.id,
        payload: {
          newStatus: request.status,
          previousStatus,
        },
        actor,
      }),
    );

    return updated;
  }

  async createMenuItem(actor: Actor, restaurantId: string, request: MenuItemCreationRequest): Promise<MenuItem> {
    const errors = await validate(request, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) {
      throw InvalidParamsError.fromClassValidator(errors);
    }

    const restaurant = await this.getRestaurantEnsuringPermissions(actor, restaurantId);

    const now = new Date();

    const menuItem = new MenuItem();
    menuItem.restaurantId = restaurant.id;
    menuItem.name = request.name;
    menuItem.price = request.price;
    menuItem.status = request.status ?? MenuItemStatus.Available;
    menuItem.createdAt = now;
    menuItem.updatedAt = now;

    const created = await this.repository.createMenuItem(menuItem);

    await this.events.publish(
      new MenuItemCreatedEvent({
        entityId: created.id,
        payload: created,
        actor,
      }),
    );

    return created;
  }

  // getRestaurantEnsuringPermissions returns a restaurant ensuring access permissions.
  // - operators may manage any restaurant
  // - restaurant owners may manage their own restaurant
  private async getRestaurantEnsuringPermissions(actor: Actor, restaurantId: string): Promise<Restaurant> {
    const restaurant = await this.repository.getById(restaurantId);

    if (actor.role !== AccountRole.Operator && actor.id !== restaurant.ownerId) {
      throw new ForbiddenError('cannot manage a restaurant you do not own');
    }

    return restaurant;
  }
}
