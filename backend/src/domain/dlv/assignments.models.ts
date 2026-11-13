import { Event } from '#domain/events/index.js';
import { Order, Restaurant } from '#domain/ord/index.js';

export enum AssignmentStatus {
  Queued = 'queued',
  Offered = 'offered',
  Accepted = 'accepted',
  Stalled = 'stalled',
}

export class Assignment {
  id: string;
  orderId: string;
  courierId: string | null;
  status: AssignmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class AssignmentComplete {
  id: string;
  status: AssignmentStatus;
  order: Order;
  restaurant: Restaurant;
}

export class AssignmentOfferedEvent extends Event<Assignment> {
  readonly entityType = 'assignment';
  readonly eventType = 'assignment.offered';
}

export class AssignmentStatusChangedEvent extends Event<{
  previousStatus: AssignmentStatus | null;
  newStatus: AssignmentStatus;
  orderId: string;
  courierId: string | null;
}> {
  readonly entityType = 'assignment';
  readonly eventType = 'assignment.status_changed';
}
