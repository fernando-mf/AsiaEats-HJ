import { InvalidCourierTransitionError } from './couriers.errors.js';
import { type Courier, CourierStatus, CourierStatusChangedEvent } from './couriers.models.js';

const ALLOWED_TRANSITIONS: Record<CourierStatus, CourierStatus[]> = {
  [CourierStatus.Offline]: [CourierStatus.Idle, CourierStatus.Assigned],
  [CourierStatus.Idle]: [CourierStatus.Offline],
  [CourierStatus.Assigned]: [CourierStatus.Idle],
  [CourierStatus.Carrying]: [CourierStatus.Assigned],
};

export class CourierStateMachine {
  constructor(private readonly courier: Courier) {}

  public transition(to: CourierStatus): CourierStatusChangedEvent | null {
    const from = this.courier.status;
    if (from === to) {
      return null;
    }
    if (!ALLOWED_TRANSITIONS[to].includes(from)) {
      throw new InvalidCourierTransitionError(from, to);
    }

    this.courier.status = to;
    this.courier.updatedAt = new Date();

    return new CourierStatusChangedEvent({
      entityId: this.courier.account.id,
      payload: { previousStatus: from, newStatus: to },
      actor: { id: this.courier.account.id, role: this.courier.account.role },
    });
  }
}
