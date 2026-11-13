import { describe, expect, it } from 'vitest';
import { AccountRole } from '#domain/reg/index.js';
import { Order, OrderStatus } from './orders.models.js';
import { InvalidOrderTransitionError } from './orders.errors.js';
import { OrderStateMachine } from './orders.statemachine.js';

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

    const cancelled = newOrder(OrderStatus.Placed);
    new OrderStateMachine(actor, cancelled).cancel();
    expect(cancelled.status).toBe(OrderStatus.Cancelled);
  });

  it('lets a customer cancel only from placed', () => {
    for (const status of [OrderStatus.Accepted, OrderStatus.Preparing, OrderStatus.Ready, OrderStatus.PickedUp]) {
      const order = newOrder(status);

      expect(() => new OrderStateMachine(actor, order).cancel()).toThrow(InvalidOrderTransitionError);
      expect(order.status).toBe(status);
    }
  });

  it('lets an operator cancel from any non-terminal state', () => {
    const operator = { id: 'operator-1', role: AccountRole.Operator };

    for (const status of [
      OrderStatus.Placed,
      OrderStatus.Accepted,
      OrderStatus.Preparing,
      OrderStatus.Ready,
      OrderStatus.PickedUp,
    ]) {
      const order = newOrder(status);
      const event = new OrderStateMachine(operator, order).cancel();

      expect(order.status).toBe(OrderStatus.Cancelled);
      expect(event.payload).toEqual({ previousStatus: status, newStatus: OrderStatus.Cancelled });
    }

    for (const status of [OrderStatus.Delivered, OrderStatus.Rejected, OrderStatus.Cancelled]) {
      expect(() => new OrderStateMachine(operator, newOrder(status)).cancel()).toThrow(InvalidOrderTransitionError);
    }
  });

  it('does not let other roles cancel', () => {
    const owner = { id: 'owner-1', role: AccountRole.Restaurant };

    expect(() => new OrderStateMachine(owner, newOrder(OrderStatus.Placed)).cancel()).toThrow(
      InvalidOrderTransitionError,
    );
  });

  it('throws an error on an invalid transition', () => {
    const order = newOrder(OrderStatus.Accepted);
    const machine = new OrderStateMachine(actor, order);

    expect(() => machine.pickUp()).toThrow(InvalidOrderTransitionError);
    expect(order.status).toBe(OrderStatus.Accepted); // order is left untouched
  });

  // The whole lifecycle in one table: from each status, the one action that moves the order on
  // (none for the terminal states). Every other action must be refused and leave it untouched.
  it('allows exactly the lifecycle moves and refuses every skipped or repeated one', () => {
    const owner = { id: 'owner-1', role: AccountRole.Restaurant };
    const actions = {
      accept: (machine: OrderStateMachine) => machine.accept(),
      reject: (machine: OrderStateMachine) => machine.reject('reason'),
      prepare: (machine: OrderStateMachine) => machine.prepare(),
      ready: (machine: OrderStateMachine) => machine.ready(),
      pickUp: (machine: OrderStateMachine) => machine.pickUp(),
      deliver: (machine: OrderStateMachine) => machine.deliver(),
      // Refused here from every status: only an operator may refund (tested below).
      refund: (machine: OrderStateMachine) => machine.refund(),
    };
    const allowed: Record<OrderStatus, Partial<Record<keyof typeof actions, OrderStatus>>> = {
      [OrderStatus.Placed]: { accept: OrderStatus.Accepted, reject: OrderStatus.Rejected },
      [OrderStatus.Accepted]: { prepare: OrderStatus.Preparing },
      [OrderStatus.Preparing]: { ready: OrderStatus.Ready },
      [OrderStatus.Ready]: { pickUp: OrderStatus.PickedUp },
      [OrderStatus.PickedUp]: { deliver: OrderStatus.Delivered },
      [OrderStatus.Delivered]: {},
      [OrderStatus.Refunded]: {},
      [OrderStatus.Rejected]: {},
      [OrderStatus.Cancelled]: {},
    };

    for (const status of Object.values(OrderStatus)) {
      for (const [name, act] of Object.entries(actions) as [
        keyof typeof actions,
        (m: OrderStateMachine) => unknown,
      ][]) {
        const order = newOrder(status);
        const machine = new OrderStateMachine(owner, order);
        const next = allowed[status][name];

        if (next) {
          act(machine);
          expect(order.status, `${status} --${name}-->`).toBe(next);
        } else {
          expect(() => act(machine), `${status} --${name}--> must be refused`).toThrow(InvalidOrderTransitionError);
          expect(order.status).toBe(status);
        }
      }
    }
  });

  it('allows no transition from a terminal state', () => {
    const machine = new OrderStateMachine(actor, newOrder(OrderStatus.Delivered));

    expect(() => machine.cancel()).toThrow(InvalidOrderTransitionError);
  });

  it('lets an operator refund a delivered order, and nothing else (R-PRC-05)', () => {
    const operator = { id: 'operator-1', role: AccountRole.Operator };
    const order = newOrder(OrderStatus.Delivered);

    const event = new OrderStateMachine(operator, order).refund();

    expect(order.status).toBe(OrderStatus.Refunded);
    expect(event.payload).toEqual({ previousStatus: OrderStatus.Delivered, newStatus: OrderStatus.Refunded });
    expect(event.actor).toEqual(operator);

    for (const status of Object.values(OrderStatus).filter(status => status !== OrderStatus.Delivered)) {
      const other = newOrder(status);
      expect(() => new OrderStateMachine(operator, other).refund(), `${status} must not be refundable`).toThrow(
        InvalidOrderTransitionError,
      );
      expect(other.status).toBe(status);
    }
  });

  it('does not let a customer refund their own delivered order', () => {
    expect(() => new OrderStateMachine(actor, newOrder(OrderStatus.Delivered)).refund()).toThrow(
      InvalidOrderTransitionError,
    );
  });

  it('allows nothing from refunded, not even an operator cancelling', () => {
    const operator = { id: 'operator-1', role: AccountRole.Operator };

    expect(() => new OrderStateMachine(operator, newOrder(OrderStatus.Refunded)).cancel()).toThrow(
      InvalidOrderTransitionError,
    );
    expect(() => new OrderStateMachine(operator, newOrder(OrderStatus.Refunded)).refund()).toThrow(
      InvalidOrderTransitionError,
    );
  });
});
