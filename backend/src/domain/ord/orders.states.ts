import { AccountRole, type Actor } from '#domain/reg/index.js';
import { InvalidOrderTransitionError } from './orders.errors.js';
import { OrderStatus } from './orders.models.js';

// State pattern (R-ORD-04). Each order status is a class that knows which actions it allows
// and which state each one leads to. The base class refuses every action, so a state only
// overrides what it permits: a skipped state (e.g. ready before preparing) can't be reached,
// because no state offers that move. OrderStateMachine is the context that delegates to them.
export abstract class OrderState {
  abstract readonly status: OrderStatus;

  accept(): OrderState {
    return this.refuse(OrderStatus.Accepted);
  }

  reject(): OrderState {
    return this.refuse(OrderStatus.Rejected);
  }

  prepare(): OrderState {
    return this.refuse(OrderStatus.Preparing);
  }

  ready(): OrderState {
    return this.refuse(OrderStatus.Ready);
  }

  pickUp(): OrderState {
    return this.refuse(OrderStatus.PickedUp);
  }

  deliver(): OrderState {
    return this.refuse(OrderStatus.Delivered);
  }

  // Only an operator may refund, and only a delivered order (DeliveredState, R-PRC-05).
  refund(_actor: Actor): OrderState {
    return this.refuse(OrderStatus.Refunded);
  }

  // An operator may cancel any order that isn't finished; customers only while it is placed
  // (PlacedState); restaurants never.
  cancel(actor: Actor): OrderState {
    if (actor.role === AccountRole.Operator) return CANCELLED;
    return this.refuse(OrderStatus.Cancelled);
  }

  protected refuse(to: OrderStatus): never {
    throw new InvalidOrderTransitionError(this.status, to);
  }
}

class PlacedState extends OrderState {
  readonly status = OrderStatus.Placed;

  accept(): OrderState {
    return ACCEPTED;
  }

  reject(): OrderState {
    return REJECTED;
  }

  cancel(actor: Actor): OrderState {
    if (actor.role === AccountRole.Customer) return CANCELLED;
    return super.cancel(actor);
  }
}

class AcceptedState extends OrderState {
  readonly status = OrderStatus.Accepted;

  prepare(): OrderState {
    return PREPARING;
  }
}

class PreparingState extends OrderState {
  readonly status = OrderStatus.Preparing;

  ready(): OrderState {
    return READY;
  }
}

class ReadyState extends OrderState {
  readonly status = OrderStatus.Ready;

  pickUp(): OrderState {
    return PICKED_UP;
  }
}

class PickedUpState extends OrderState {
  readonly status = OrderStatus.PickedUp;

  deliver(): OrderState {
    return DELIVERED;
  }
}

// The states where the order's journey is over: nothing can cancel them, not even an operator.
abstract class FinalState extends OrderState {
  cancel(): OrderState {
    return this.refuse(OrderStatus.Cancelled);
  }
}

// A delivered order allows one last move: an operator's refund (R-PRC-05).
class DeliveredState extends FinalState {
  readonly status = OrderStatus.Delivered;

  refund(actor: Actor): OrderState {
    if (actor.role === AccountRole.Operator) return REFUNDED;
    return super.refund(actor);
  }
}

class RefundedState extends FinalState {
  readonly status = OrderStatus.Refunded;
}

class RejectedState extends FinalState {
  readonly status = OrderStatus.Rejected;
}

class CancelledState extends FinalState {
  readonly status = OrderStatus.Cancelled;
}

// States hold no data, so one instance of each is shared by every order.
const ACCEPTED = new AcceptedState();
const PREPARING = new PreparingState();
const READY = new ReadyState();
const PICKED_UP = new PickedUpState();
const DELIVERED = new DeliveredState();
const REFUNDED = new RefundedState();
const REJECTED = new RejectedState();
const CANCELLED = new CancelledState();

const STATES: Record<OrderStatus, OrderState> = {
  [OrderStatus.Placed]: new PlacedState(),
  [OrderStatus.Accepted]: ACCEPTED,
  [OrderStatus.Preparing]: PREPARING,
  [OrderStatus.Ready]: READY,
  [OrderStatus.PickedUp]: PICKED_UP,
  [OrderStatus.Delivered]: DELIVERED,
  [OrderStatus.Refunded]: REFUNDED,
  [OrderStatus.Rejected]: REJECTED,
  [OrderStatus.Cancelled]: CANCELLED,
};

// stateOf returns the state object for a stored status.
export function stateOf(status: OrderStatus): OrderState {
  return STATES[status];
}
