import { Injectable } from '@nestjs/common';
import { validate } from 'class-validator';
import { EventsService } from '#domain/events/index.js';
import { InvalidParamsError } from '#domain/errors.js';
import type { Actor } from '#domain/reg/index.js';
import { MenuItemNotInMenuError, MenuItemSoldOutError, RestaurantNotOpenError } from './orders.errors.js';
import {
  Order,
  OrderLine,
  OrderPlacedEvent,
  OrderPlacementRequest,
  OrderRejectionRequest,
  OrderStatus,
} from './orders.models.js';
import { OrderStateMachine } from './orders.statemachine.js';
import { MenuItemStatus, RestaurantStatus } from './restaurants.models.js';
import { RestaurantsService } from './restaurants.service.js';

export abstract class OrderRepository {
  abstract create(order: Order): Promise<Order>;
  abstract getById(id: string): Promise<Order>;
  abstract updateStatus(order: Order): Promise<Order>;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly repository: OrderRepository,
    private readonly restaurants: RestaurantsService,
    private readonly events: EventsService,
  ) {}

  async place(actor: Actor, request: OrderPlacementRequest): Promise<Order> {
    const errors = await validate(request, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) {
      throw InvalidParamsError.fromClassValidator(errors);
    }

    const ids = request.items.map(item => item.menuItemId);
    if (new Set(ids).size !== ids.length) {
      throw new InvalidParamsError([{ field: 'items', messages: ['menuItemId must be unique'] }]);
    }

    const restaurant = await this.restaurants.getById(request.restaurantId);
    if (restaurant.status !== RestaurantStatus.Open) {
      throw new RestaurantNotOpenError(restaurant.status);
    }

    const menu = new Map((await this.restaurants.getMenu(restaurant.id)).map(item => [item.id, item]));

    const lines = request.items.map(item => {
      const menuItem = menu.get(item.menuItemId);
      if (!menuItem) {
        throw new MenuItemNotInMenuError(item.menuItemId);
      }
      if (menuItem.status === MenuItemStatus.SoldOut) {
        throw new MenuItemSoldOutError(menuItem.id);
      }

      const line = new OrderLine();
      line.menuItemId = menuItem.id;
      line.name = menuItem.name;
      line.unitPrice = menuItem.price;
      line.quantity = item.quantity;
      return line;
    });

    const now = new Date();

    const order = new Order();
    order.customerId = actor.id;
    order.restaurantId = restaurant.id;
    order.status = OrderStatus.Placed;
    order.lines = lines;
    order.createdAt = now;
    order.updatedAt = now;

    const created = await this.repository.create(order);

    await this.events.publish(
      new OrderPlacedEvent({
        entityId: created.id,
        payload: created,
        actor,
      }),
    );

    return created;
  }

  async accept(actor: Actor, id: string): Promise<Order> {
    const order = await this.repository.getById(id);
    await this.restaurants.ensureOwnership(actor, order.restaurantId);

    const event = new OrderStateMachine(actor, order).accept();
    order.updatedAt = new Date();

    const updated = await this.repository.updateStatus(order);
    await this.events.publish(event);

    return updated;
  }

  async reject(actor: Actor, id: string, request: OrderRejectionRequest): Promise<Order> {
    const errors = await validate(request, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) {
      throw InvalidParamsError.fromClassValidator(errors);
    }

    const order = await this.repository.getById(id);
    await this.restaurants.ensureOwnership(actor, order.restaurantId);

    const event = new OrderStateMachine(actor, order).reject(request.reason);
    order.updatedAt = new Date();

    const updated = await this.repository.updateStatus(order);
    await this.events.publish(event);

    return updated;
  }
}
