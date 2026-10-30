import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { NotFoundError, UnauthenticatedError } from '#domain/errors.js';
import { AccountsService, type Actor } from '#domain/reg/index.js';
import { IS_PUBLIC_KEY } from '#application/auth/public.decorator.js';

export type AuthenticatedRequest = {
  headers: { authorization?: string };
  actor?: Actor;
};

type AccessTokenPayload = { sub?: unknown; role?: unknown };

// JwtAuthGuard reads the JWT in the headers and valiates it. Missing a token,
// an invalid one, or one whose account no longer exists (e.g. after an
// environment reset) rejects the request.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly accounts: AccountsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, { algorithms: ['HS256'] });
    } catch {
      throw new UnauthenticatedError('invalid or expired token');
    }

    request.actor = await this.toActor(payload);
    return true;
  }

  private extractToken(request: AuthenticatedRequest): string {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) {
      throw new UnauthenticatedError('missing access token');
    }
    return token;
  }

  // toActor loads the token's account so the actor's id and role come from the database.
  private async toActor(payload: AccessTokenPayload): Promise<Actor> {
    if (typeof payload.sub !== 'string' || !payload.sub) {
      throw new UnauthenticatedError('invalid or expired token');
    }

    try {
      const account = await this.accounts.getById(payload.sub);
      return { id: account.id, role: account.role };
    } catch (err) {
      if (err instanceof NotFoundError) {
        throw new UnauthenticatedError('account no longer exists');
      }
      throw err;
    }
  }
}
