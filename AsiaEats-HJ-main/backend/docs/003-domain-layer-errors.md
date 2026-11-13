# Domain layer errors

Errors are an important part of the domain layer. They are used to represent business rules violations and other failures. NestJS provides some out of the box HTTP exceptions like `HttpException` and `NotFoundException`, but those are highly coupled to the HTTP layer and do not express our business rules well.

For this reason, we decided to create our own application errors. They live in the `domain` layer and can be thrown anywhere in the application.

Every application error extends the abstract `ApplicationError` class. This class defines two abstract fields:

- `statusCode`: the HTTP status, as a plain number. The domain does not import NestJS.
- `code`: a domain constant that identifies the error.

Other errors like `InvalidParamsError` or `DuplicateEntityError` inherits from the base class and overrides the abstract fields. These subclasses also define fields of their own, for example the `DuplicateEntityError` has an `entityType` field.

## Error types

All errors live in `backend/src/domain/errors.ts`, see that file for the complete implementation. The following code snippet shows a simplifed version of it.

```ts
// domain/errors.ts
export abstract class ApplicationError extends Error {
  // ... implementation
}

export class DuplicateEntityError extends ApplicationError {
  statusCode = 409;
  code = "duplicate_entity";

  constructor(readonly entityType: string) {
    super(`duplicate: ${entityType}`);
  }
}

// ... UnauthenticatedError, ForbiddenError, InternalError, InvalidParamsError
```

## Throwing errors

Code written by ourselves **MUST** throw one of our application errors. When working with a library e.g. a database client, we should handle the errors thrown by the library and throw our own application errors. If we don't do that, the unhandled errors get returned as `InternalError` to the client.

Example for request validation errors:

```ts
const errors = await validate(request);
if (errors.length > 0) {
  throw InvalidParamsError.fromClassValidator(errors);
}
```

Example for account not found:

```ts
const account = await this.accounts.findById(id);
if (!account) {
  throw new NotFoundError("account");
}
```

## HTTP responses

We implemented a custom exception filter (`ApplicationErrorFilter`) in the `application` layer that automatically converts any thrown error to a JSON response. If an error is unhandled, it gets converted to an `InternalError`.

Below are some examples of response bodies for different errors.

A missing account (HTTP 404):

```json
{
  "code": "not_found",
  "entityType": "account"
}
```

A duplicate account (HTTP 409):

```json
{
  "code": "duplicate_entity",
  "entityType": "account"
}
```

An invalid request (HTTP 400):

```json
{
  "code": "invalid_params",
  "errors": [
    {
      "field": "role",
      "messages": [
        "role must be one of the following values: customer, restaurant, courier, operator"
      ]
    }
  ]
}
```

A failed login (HTTP 401):

```json
{
  "code": "unauthenticated",
  "reason": "invalid credentials"
}
```
