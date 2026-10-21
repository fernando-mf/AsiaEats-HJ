import { ApplicationError } from '#domain/errors.js';
import type { Actor } from '#domain/reg/index.js';
import { Order, OrderStatus, OrderStatusChangedEvent } from './orders.models.js';

export class InvalidOrderTransitionError extends ApplicationError {
  statusCode = 409;
  code = 'invalid_order_transition';

  constructor(
    readonly from: OrderStatus,
    readonly to: OrderStatus,
  ) {
    super(`invalid order transition: ${from} -> ${to}`);
  }
}

// Order status transition rules.
const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.Placed]: [OrderStatus.Accepted, OrderStatus.Rejected, OrderStatus.Cancelled],
  [OrderStatus.Accepted]: [OrderStatus.Preparing, OrderStatus.Cancelled],
  [OrderStatus.Preparing]: [OrderStatus.Ready, OrderStatus.Cancelled],
  [OrderStatus.Ready]: [OrderStatus.PickedUp],
  [OrderStatus.PickedUp]: [OrderStatus.Delivered],
  [OrderStatus.Delivered]: [],
  [OrderStatus.Rejected]: [],
  [OrderStatus.Cancelled]: [],
};

function validateTransition(from: OrderStatus, to: OrderStatus): void {
  const allowed = ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;

  if (!allowed) {
    throw new InvalidOrderTransitionError(from, to);
  }
}

// OrderStateMachine defines available transitions on an order. Each transition is validated.
export class OrderStateMachine {
  constructor(
    private readonly actor: Actor,
    private readonly order: Order,
  ) {}

  accept(): OrderStatusChangedEvent {
    return this.transition(OrderStatus.Accepted);
  }

  reject(reason: string): OrderStatusChangedEvent {
    const event = this.transition(OrderStatus.Rejected, { reason });
    this.order.rejectionReason = reason;
    return event;
  }

  cancel(): OrderStatusChangedEvent {
    return this.transition(OrderStatus.Cancelled);
  }

  prepare(): OrderStatusChangedEvent {
    return this.transition(OrderStatus.Preparing);
  }

  ready(): OrderStatusChangedEvent {
    return this.transition(OrderStatus.Ready);
  }

  pickUp(): OrderStatusChangedEvent {
    return this.transition(OrderStatus.PickedUp);
  }

  deliver(): OrderStatusChangedEvent {
    return this.transition(OrderStatus.Delivered);
  }

  private transition(to: OrderStatus, extra: { reason?: string } = {}): OrderStatusChangedEvent {
    const previousStatus = this.order.status;
    validateTransition(previousStatus, to);

    this.order.status = to;

    return new OrderStatusChangedEvent({
      entityId: this.order.id,
      payload: { previousStatus, newStatus: to, ...extra },
      actor: this.actor,
    });
  }
}
