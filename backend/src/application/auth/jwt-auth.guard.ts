import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UnauthenticatedError } from '#domain/errors.js';
import { AccountRole, type Actor } from '#domain/reg/index.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';

export type AuthenticatedRequest = {
  headers: { authorization?: string };
  actor?: Actor;
};

type AccessTokenPayload = { sub?: unknown; role?: unknown };

// JwtAuthGuard reads the JWT in the headers and valiates it. Missing a token
// or an invalid one rejects the request.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
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

    request.actor = this.toActor(payload);
    return true;
  }

  private extractToken(request: AuthenticatedRequest): string {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) {
      throw new UnauthenticatedError('missing access token');
    }
    return token;
  }

  private toActor(payload: AccessTokenPayload): Actor {
    const { sub, role } = payload;
    return { id: sub as string, role: role as AccountRole };
  }
}
