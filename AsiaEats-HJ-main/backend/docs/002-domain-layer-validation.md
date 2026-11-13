# Domain layer validation

To stay aligned with the requirements, our app needs to define clear validation rules. These validation rules are part of the business rules and they belong in the **Domain** layer. Other layers such as the **Application** layer, are not responsible for this.

## Defining validation rules

The request objects sit next to the service that uses them e.g. for account creation that is `domain/registration/`. Validation rules use `class-validator` decorators. Each request class exposes `initialize`, which turns the raw body into an instance.

```ts
// domain/registration/registration.ts
import { plainToInstance } from "class-transformer";
import { IsEmail, IsString, MinLength } from "class-validator";

export class AccountCreationRequest {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  static initialize(raw: AccountCreationRequest): AccountCreationRequest {
    return plainToInstance(AccountCreationRequest, raw);
  }
}
```

## Executing validation rules

Validation rules are enforced and executed in our **Service** classes. They are executed before any other business rules are run.

```ts
// domain/registration/registration.ts
import { validate } from "class-validator";

class RegistrationService {
  async create(request: AccountCreationRequest) {
    const errors = await validate(request);

    if (errors.length > 0) {
      throw InvalidParamsError.fromClassValidator(errors);
    }

    // ... additional code to process account creation
  }
}
```

## Initializing request objects

The controller builds the request with `initialize` and forwards the instance to the service. The same pattern is used in all request objects.

```ts
// application/registration/registration.controller.ts
@Post()
create(@Body() body: AccountCreationRequest) {
  const request = AccountCreationRequest.initialize(body);
  return this.registrationService.create(request);
}
```
