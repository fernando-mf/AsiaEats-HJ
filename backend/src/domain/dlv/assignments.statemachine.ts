import type { Actor } from '#domain/reg/index.js';
import { InvalidAssignmentTransitionError } from './assignments.errors.js';
import { type Assignment, AssignmentStatus, AssignmentStatusChangedEvent } from './assignments.models.js';

const ALLOWED_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  [AssignmentStatus.Queued]: [AssignmentStatus.Offered],
  [AssignmentStatus.Offered]: [AssignmentStatus.Queued],
  [AssignmentStatus.Accepted]: [AssignmentStatus.Offered],
  [AssignmentStatus.Stalled]: [AssignmentStatus.Accepted],
};

export class AssignmentStateMachine {
  constructor(
    private readonly assignment: Assignment,
    private readonly actor: Actor,
  ) {}

  public accept(): AssignmentStatusChangedEvent {
    return this.transition(AssignmentStatus.Accepted);
  }

  public requeue(): AssignmentStatusChangedEvent {
    const e = this.transition(AssignmentStatus.Queued);
    this.assignment.courierId = null;
    return e;
  }

  public stall(): AssignmentStatusChangedEvent {
    return this.transition(AssignmentStatus.Stalled);
  }

  private transition(to: AssignmentStatus): AssignmentStatusChangedEvent {
    const from = this.assignment.status;
    if (!ALLOWED_TRANSITIONS[to].includes(from)) {
      throw new InvalidAssignmentTransitionError(from, to);
    }

    this.assignment.status = to;
    this.assignment.updatedAt = new Date();

    return new AssignmentStatusChangedEvent({
      entityId: this.assignment.id,
      payload: {
        previousStatus: from,
        newStatus: to,
        orderId: this.assignment.orderId,
        courierId: this.assignment.courierId,
      },
      actor: this.actor,
    });
  }
}
