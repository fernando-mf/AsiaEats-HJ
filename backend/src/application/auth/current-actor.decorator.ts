import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Actor } from '#domain/reg/index.js';
import type { AuthenticatedRequest } from './jwt-auth.guard.js';

// CurrentActor returns the actor extracted by the JwtAuthGuard.
export const CurrentActor = createParamDecorator((_: unknown, context: ExecutionContext): Actor => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.actor!;
});
