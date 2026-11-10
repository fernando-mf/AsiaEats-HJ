import type { Actor } from '#domain/reg/index.js';
import { type Order, OrderStatusChangedEvent } from './orders.models.js';
import { type OrderState, stateOf } from './orders.states.js';

// OrderStateMachine is the context of the State pattern (R-ORD-04): it holds the order's
// current state and delegates each action to it. The state either refuses the action
// (InvalidOrderTransitionError, leaving the order untouched) or returns the next state; the
// context then moves the order to it and returns the event to record (R-ORD-05).
export class OrderStateMachine {
  private state: OrderState;

  constructor(
    private readonly actor: Actor,
    private readonly order: Order,
  ) {
    this.state = stateOf(order.status);
  }

  accept(): OrderStatusChangedEvent {
    return this.moveTo(this.state.accept());
  }

  reject(reason: string): OrderStatusChangedEvent {
    const event = this.moveTo(this.state.reject(), { reason });
    this.order.rejectionReason = reason;
    return event;
  }

  cancel(): OrderStatusChangedEvent {
    return this.moveTo(this.state.cancel(this.actor));
  }

  prepare(): OrderStatusChangedEvent {
    return this.moveTo(this.state.prepare());
  }

  ready(): OrderStatusChangedEvent {
    return this.moveTo(this.state.ready());
  }

  pickUp(): OrderStatusChangedEvent {
    return this.moveTo(this.state.pickUp());
  }

  deliver(): OrderStatusChangedEvent {
    return this.moveTo(this.state.deliver());
  }

  private moveTo(next: OrderState, extra: { reason?: string } = {}): OrderStatusChangedEvent {
    const previousStatus = this.state.status;
    this.state = next;
    this.order.status = next.status;

    return new OrderStatusChangedEvent({
      entityId: this.order.id,
      payload: { previousStatus, newStatus: next.status, ...extra },
      actor: this.actor,
    });
  }
}
