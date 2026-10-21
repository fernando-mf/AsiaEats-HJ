import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
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

export class OrderRejectionRequest {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;

  static initialize(raw: OrderRejectionRequest): OrderRejectionRequest {
    return plainToInstance(OrderRejectionRequest, raw);
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
  rejectionReason?: string;
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
  reason?: string;
}> {
  readonly entityType = 'order';
  readonly eventType = 'order.status_changed';
}
