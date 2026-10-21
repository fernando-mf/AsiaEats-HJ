import { describe, expect, it } from 'vitest';
import { AccountRole } from '#domain/reg/index.js';
import { Order, OrderStatus } from './orders.models.js';
import { InvalidOrderTransitionError, OrderStateMachine } from './orders.statemachine.js';

describe('OrderStateMachine', () => {
  const actor = { id: 'user-1', role: AccountRole.Customer };

  function newOrder(status: OrderStatus): Order {
    const order = new Order();
    order.id = 'order-1';
    order.status = status;
    return order;
  }

  it('walks the happy path and returns an event per transition', () => {
    const order = newOrder(OrderStatus.Placed);
    const machine = new OrderStateMachine(actor, order);

    const steps = [
      [machine.accept(), OrderStatus.Placed, OrderStatus.Accepted],
      [machine.prepare(), OrderStatus.Accepted, OrderStatus.Preparing],
      [machine.ready(), OrderStatus.Preparing, OrderStatus.Ready],
      [machine.pickUp(), OrderStatus.Ready, OrderStatus.PickedUp],
      [machine.deliver(), OrderStatus.PickedUp, OrderStatus.Delivered],
    ] as const;

    for (const [event, previousStatus, newStatus] of steps) {
      expect(event.eventType).toBe('order.status_changed');
      expect(event.entityId).toBe('order-1');
      expect(event.actor).toEqual(actor);
      expect(event.payload).toEqual({ previousStatus, newStatus });
    }
    expect(order.status).toBe(OrderStatus.Delivered);
  });

  it('can reject and cancel', () => {
    const rejected = newOrder(OrderStatus.Placed);
    new OrderStateMachine(actor, rejected).reject('out of stock');
    expect(rejected.status).toBe(OrderStatus.Rejected);

    const cancelled = newOrder(OrderStatus.Accepted);
    new OrderStateMachine(actor, cancelled).cancel();
    expect(cancelled.status).toBe(OrderStatus.Cancelled);
  });

  it('throws an error on an invalid transition', () => {
    const order = newOrder(OrderStatus.Accepted);
    const machine = new OrderStateMachine(actor, order);

    expect(() => machine.pickUp()).toThrow(InvalidOrderTransitionError);
    expect(order.status).toBe(OrderStatus.Accepted); // order is left untouched
  });

  it('allows no transition from a terminal state', () => {
    const machine = new OrderStateMachine(actor, newOrder(OrderStatus.Delivered));

    expect(() => machine.cancel()).toThrow(InvalidOrderTransitionError);
  });
});
