import { plainToInstance, Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';
import { Event } from '#domain/events/index.js';

export enum OrderStatus {
  Placed = 'placed',
  Accepted = 'accepted',
  Preparing = 'preparing',
  Ready = 'ready',
  PickedUp = 'picked_up',
  Delivered = 'delivered',
  Rejected = 'rejected',
  Cancelled = 'cancelled',
}

export class OrderItemRequest {
  @IsUUID()
  menuItemId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class OrderPlacementRequest {
  @IsUUID()
  restaurantId: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItemRequest)
  items: OrderItemRequest[];

  static initialize(raw: OrderPlacementRequest): OrderPlacementRequest {
    return plainToInstance(OrderPlacementRequest, raw);
  }
}

export class OrderLine {
  id: string;
  orderId: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export class Order {
  id: string;
  customerId: string;
  restaurantId: string;
  status: OrderStatus;
  lines: OrderLine[];
  createdAt: Date;
  updatedAt: Date;
}

export class OrderPlacedEvent extends Event<Order> {
  readonly entityType = 'order';
  readonly eventType = 'order.placed';
}

export class OrderStatusChangedEvent extends Event<{
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
}> {
  readonly entityType = 'order';
  readonly eventType = 'order.status_changed';
}
