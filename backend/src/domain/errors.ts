import { ValidationError as ClassValidatorError } from 'class-validator';

export abstract class ApplicationError extends Error {
  // statusCode is the HTTP status code. We understand the `domain` layer should not have
  // any knowledge of HTTP but we're keeping this here for convenience. However, if strictness
  // is desired, this could be fixed by implementing an "applicationErrorToHttp()" helper
  // in the `application` layer.
  abstract readonly statusCode: number;

  // code is a domain constant that is used to identify the error.
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
  }

  toJSON() {
    const { statusCode, code, ...rest } = this;
    return {
      code,
      ...rest,
    };
  }
}

export class InternalError extends ApplicationError {
  statusCode = 500;
  code = 'internal';

  constructor(readonly err: Error | string) {
    super(`internal: ${err}`);
  }
}

export class NotFoundError extends ApplicationError {
  statusCode = 404;
  code = 'not_found';

  constructor(readonly entityType: string) {
    super(`not found: ${entityType}`);
  }
}

export class UnauthenticatedError extends ApplicationError {
  statusCode = 401;
  code = 'unauthenticated';

  constructor(readonly reason?: string) {
    super(`unauthenticated: ${reason}`);
  }
}

export class ForbiddenError extends ApplicationError {
  statusCode = 403;
  code = 'forbidden';

  constructor(readonly reason?: string) {
    super(`forbidden: ${reason}`);
  }
}

export class DuplicateEntityError extends ApplicationError {
  statusCode = 409;
  code = 'duplicate_entity';

  constructor(readonly entityType: string) {
    super(`duplicate: ${entityType}`);
  }
}

type FieldError = { field: string; messages: string[] };

export class InvalidParamsError extends ApplicationError {
  statusCode = 400;
  code = 'invalid_params';

  constructor(readonly errors: FieldError[]) {
    const keys = errors.map(e => e.field);
    super(`invalid params: ${keys.join(', ')}`);
  }

  static fromClassValidator(errors: ClassValidatorError[]): InvalidParamsError {
    return new InvalidParamsError(flattenClassValidatorErrors(errors));
  }
}

function flattenClassValidatorErrors(errors: ClassValidatorError[], parent = ''): FieldError[] {
  return errors.flatMap(e => {
    const field = parent ? `${parent}.${e.property}` : e.property;
    const own = e.constraints ? [{ field, messages: Object.values(e.constraints) }] : [];
    return [...own, ...flattenClassValidatorErrors(e.children ?? [], field)];
  });
}
