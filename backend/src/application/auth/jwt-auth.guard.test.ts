import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { JwtService } from '@nestjs/jwt';
import { describe, expect, it, vi } from 'vitest';
import { NotFoundError, UnauthenticatedError } from '#domain/errors.js';
import { AccountRole, type AccountsService } from '#domain/reg/index.js';
import { type AuthenticatedRequest, JwtAuthGuard } from './jwt-auth.guard.js';

function setup({ isPublic = false, authorization }: { isPublic?: boolean; authorization?: string } = {}) {
  const request: AuthenticatedRequest = { headers: { authorization } };
  const context = {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  const reflector = { getAllAndOverride: vi.fn().mockReturnValue(isPublic) } as unknown as Reflector;
  const verifyAsync = vi.fn();
  const jwt = { verifyAsync } as unknown as JwtService;
  const getById = vi.fn();
  const accounts = { getById } as unknown as AccountsService;

  return { guard: new JwtAuthGuard(jwt, reflector, accounts), context, request, verifyAsync, getById };
}

describe('JwtAuthGuard', () => {
  it('lets public routes through without a token', async () => {
    const { guard, context, verifyAsync } = setup({ isPublic: true });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects a request without a bearer token', async () => {
    const { guard, context } = setup();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('rejects an invalid or expired token', async () => {
    const { guard, context, verifyAsync } = setup({ authorization: 'Bearer bad-token' });
    verifyAsync.mockRejectedValue(new Error('jwt expired'));

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('rejects a valid token whose account no longer exists', async () => {
    const { guard, context, verifyAsync, getById } = setup({ authorization: 'Bearer token' });
    verifyAsync.mockResolvedValue({ sub: 'account-1', role: AccountRole.Customer });
    getById.mockRejectedValue(new NotFoundError('account'));

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      code: 'unauthenticated',
      reason: 'account no longer exists',
    });
  });

  it('sets the actor from the stored account', async () => {
    const { guard, context, request, verifyAsync, getById } = setup({ authorization: 'Bearer token' });
    verifyAsync.mockResolvedValue({ sub: 'account-1', role: AccountRole.Customer });
    getById.mockResolvedValue({ id: 'account-1', role: AccountRole.Customer });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.actor).toEqual({ id: 'account-1', role: AccountRole.Customer });
  });
});
