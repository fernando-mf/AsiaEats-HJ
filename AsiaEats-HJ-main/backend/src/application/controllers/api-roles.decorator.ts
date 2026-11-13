import { applyDecorators } from '@nestjs/common';
import { ApiExtension, ApiForbiddenResponse, DECORATORS } from '@nestjs/swagger';
import type { AccountRole } from '#domain/reg/index.js';
import { ErrorResponse } from '#application/controllers/responses.dto.js';

const ROLES_METADATA = 'asiaeats:roles';

// Documents the roles allowed on a route. Read them back with `getApiRoles(this.handler)`
// when building the `AuthorizedCommand`, so the docs and the role enforcement stay in sync.
// Must be placed above `@ApiOperation` so the roles are appended to its description!!!
export function ApiRoles(...roles: AccountRole[]): MethodDecorator {
  const list = roles.map(role => `\`${role}\``).join(', ');

  const describe: MethodDecorator = (_target, _key, descriptor) => {
    const operation = Reflect.getMetadata(DECORATORS.API_OPERATION, descriptor.value!) ?? {};
    const description = [operation.description, `**Allowed roles:** ${list}`].filter(Boolean).join('\n\n');
    Reflect.defineMetadata(DECORATORS.API_OPERATION, { ...operation, description }, descriptor.value!);
    Reflect.defineMetadata(ROLES_METADATA, roles, descriptor.value!);
  };

  return applyDecorators(
    ApiExtension('x-roles', roles),
    ApiForbiddenResponse({ type: ErrorResponse, description: `Requires one of the roles: ${list}` }),
    describe,
  );
}

export function getApiRoles(handler: object): readonly AccountRole[] {
  return Reflect.getMetadata(ROLES_METADATA, handler) ?? [];
}
