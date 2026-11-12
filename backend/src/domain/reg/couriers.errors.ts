import { ApplicationError } from '#domain/errors.js';
import type { CourierStatus } from './couriers.models.js';

// A courier status change that the courier's current status does not allow, e.g. going offline
// while carrying an order (R-DLV-03).
export class InvalidCourierTransitionError extends ApplicationError {
  statusCode = 409;
  code = 'invalid_courier_transition';

  constructor(
    readonly from: CourierStatus,
    readonly to: CourierStatus,
  ) {
    super(`invalid courier transition: ${from} -> ${to}`);
  }
}
