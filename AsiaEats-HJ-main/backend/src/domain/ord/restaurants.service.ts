import { Injectable } from '@nestjs/common';
import { validate } from 'class-validator';
import { EventsService } from '#domain/events/index.js';
import { ForbiddenError, InvalidParamsError } from '#domain/errors.js';
import { AccountRole, type Actor } from '#domain/reg/index.js';
import {
  MenuItem,
  MenuItemCreatedEvent,
  MenuItemCreationRequest,
  MenuItemDeletedEvent,
  MenuItemStatus,
  MenuItemUpdatedEvent,
  MenuItemUpdateRequest,
  Restaurant,
  RestaurantCreatedEvent,
  RestaurantCreationRequest,
  type RestaurantFilter,
  RestaurantSearchRequest,
  type RestaurantSearchResult,
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
  abstract list(filter?: RestaurantFilter): Promise<RestaurantSearchResult[]>;

  abstract createMenuItem(menuItem: MenuItem): Promise<MenuItem>;
  abstract getMenuItem(restaurantId: string, itemId: string): Promise<MenuItem>;
  abstract listMenuItems(restaurantId: string): Promise<MenuItem[]>;
  abstract updateMenuItem(menuItem: MenuItem): Promise<MenuItem>;
  abstract deleteMenuItem(restaurantId: string, itemId: string): Promise<void>;
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

    const restaurant = await this.getManagedRestaurant(actor, id);

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

    const restaurant = await this.getManagedRestaurant(actor, id);

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

  async getById(id: string): Promise<Restaurant> {
    return this.repository.getById(id);
  }

  async find(request: RestaurantSearchRequest): Promise<RestaurantSearchResult[]> {
    const errors = await validate(request);
    if (errors.length > 0) {
      throw InvalidParamsError.fromClassValidator(errors);
    }

    const filter: RestaurantFilter = {};
    if (request.lat !== undefined && request.lon !== undefined) {
      filter.position = { latitude: request.lat, longitude: request.lon };
      filter.radiusKm = request.radiusKm;
    }

    return this.repository.list(filter);
  }

  async getMenu(restaurantId: string): Promise<MenuItem[]> {
    const restaurant = await this.repository.getById(restaurantId);
    return this.repository.listMenuItems(restaurant.id);
  }

  async createMenuItem(actor: Actor, restaurantId: string, request: MenuItemCreationRequest): Promise<MenuItem> {
    const errors = await validate(request, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) {
      throw InvalidParamsError.fromClassValidator(errors);
    }

    const restaurant = await this.getManagedRestaurant(actor, restaurantId);

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

  async updateMenuItem(
    actor: Actor,
    restaurantId: string,
    itemId: string,
    request: MenuItemUpdateRequest,
  ): Promise<MenuItem> {
    const errors = await validate(request, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) {
      throw InvalidParamsError.fromClassValidator(errors);
    }

    const restaurant = await this.getManagedRestaurant(actor, restaurantId);
    const menuItem = await this.repository.getMenuItem(restaurant.id, itemId);

    menuItem.name = request.name;
    menuItem.price = request.price;
    menuItem.status = request.status;
    menuItem.updatedAt = new Date();

    const updated = await this.repository.updateMenuItem(menuItem);

    await this.events.publish(
      new MenuItemUpdatedEvent({
        entityId: updated.id,
        payload: updated,
        actor,
      }),
    );

    return updated;
  }

  async deleteMenuItem(actor: Actor, restaurantId: string, itemId: string): Promise<void> {
    const restaurant = await this.getManagedRestaurant(actor, restaurantId);

    await this.repository.deleteMenuItem(restaurant.id, itemId);

    await this.events.publish(
      new MenuItemDeletedEvent({
        entityId: itemId,
        actor,
      }),
    );
  }

  // getManagedRestaurant returns a restaurant ensuring the actor may manage it.
  // - operators may manage any restaurant
  // - restaurant owners may manage their own restaurant
  async getManagedRestaurant(actor: Actor, restaurantId: string): Promise<Restaurant> {
    const restaurant = await this.repository.getById(restaurantId);

    if (actor.role !== AccountRole.Operator && actor.id !== restaurant.ownerId) {
      throw new ForbiddenError('cannot manage a restaurant you do not own');
    }

    return restaurant;
  }
}
