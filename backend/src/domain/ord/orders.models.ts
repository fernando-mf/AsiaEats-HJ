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

// TODO: implement order model
export class Order {
  id: string;
  status: OrderStatus;
}

export class OrderStatusChangedEvent extends Event<{
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
}> {
  readonly entityType = 'order';
  readonly eventType = 'order.status_changed';
}
