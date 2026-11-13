import { ApplicationError } from '#domain/errors.js';
import type { AssignmentStatus } from './assignments.models.js';

export class InvalidAssignmentTransitionError extends ApplicationError {
  statusCode = 409;
  code = 'invalid_assignment_transition';

  constructor(
    readonly from: AssignmentStatus,
    readonly to: AssignmentStatus,
  ) {
    super(`invalid assignment transition: ${from} -> ${to}`);
  }
}
