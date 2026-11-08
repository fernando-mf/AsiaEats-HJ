import { Inject, Injectable } from '@nestjs/common';
import { validate } from 'class-validator';
import {
  AccountCreationRequest,
  Account,
  AccountPasswordChangedEvent,
  AccountRole,
  AccountUpdatedEvent,
  AccountUpdateRequest,
  type Actor,
  LoginRequest,
  PasswordChangeRequest,
} from './accounts.models.js';
import {
  ACCOUNT_CREATION_HANDLERS,
  type AccountCreationHandler,
  DefaultAccountCreationHandler,
} from './accounts.handlers.js';
import { hashPassword, verifyPassword } from './accounts.helpers.js';
import { EventsService } from '#domain/events/index.js';
import { ForbiddenError, InvalidParamsError, UnauthenticatedError } from '#domain/errors.js';

export abstract class AccountRepository {
  abstract create(request: Account): Promise<Account>;
  abstract update(account: Account): Promise<Account>;
  abstract getByUsername(username: string): Promise<Account>;
  abstract getById(id: string): Promise<Account>;
}

@Injectable()
export class AccountsService {
  constructor(
    private readonly accounts: AccountRepository,
    @Inject(ACCOUNT_CREATION_HANDLERS) private readonly handlers: AccountCreationHandler[],
    private readonly defaultHandler: DefaultAccountCreationHandler,
    private readonly events: EventsService,
  ) {}

  // register creates an account through the public sign-up. Operator accounts are
  // predefined (seeded) and cannot be self-registered.
  async register(request: AccountCreationRequest): Promise<Account> {
    if (request.role === AccountRole.Operator) {
      throw new ForbiddenError('operator accounts are predefined and cannot be registered');
    }

    return this.create(request);
  }

  async create(request: AccountCreationRequest): Promise<Account> {
    const errors = await validate(request);
    if (errors.length > 0) {
      throw InvalidParamsError.fromClassValidator(errors);
    }

    const now = new Date();

    const account = new Account();
    account.name = request.name;
    account.username = request.username;
    account.role = request.role;
    account.passwordHash = await hashPassword(request.password);
    account.createdAt = now;
    account.updatedAt = now;

    const created = await this.accounts.create(account);

    await this.onCreated(created);

    return created;
  }

  // onCreated delegates the rest of the account creation process to the specialized role handlers.
  private async onCreated(account: Account): Promise<void> {
    const handler = this.handlers.find(h => h.role === account.role) ?? this.defaultHandler;
    await handler.handleAccountCreation(account);
  }

  async login(request: LoginRequest): Promise<Account> {
    const errors = await validate(request);
    if (errors.length > 0) {
      throw InvalidParamsError.fromClassValidator(errors);
    }

    const account = await this.accounts.getByUsername(request.username);

    const valid = await verifyPassword(request.password, account.passwordHash);
    if (!valid) {
      throw new UnauthenticatedError('invalid credentials');
    }

    return account;
  }

  getById(id: string): Promise<Account> {
    return this.accounts.getById(id);
  }

  // update changes the signed-in account's display name. Username and role are fixed.
  async update(actor: Actor, request: AccountUpdateRequest): Promise<Account> {
    const errors = await validate(request);
    if (errors.length > 0) {
      throw InvalidParamsError.fromClassValidator(errors);
    }

    const account = await this.accounts.getById(actor.id);
    account.name = request.name;
    account.updatedAt = new Date();

    const updated = await this.accounts.update(account);

    await this.events.publish(
      new AccountUpdatedEvent({
        entityId: updated.id,
        payload: updated.toJSON(),
        actor,
      }),
    );

    return updated;
  }

  // changePassword replaces the password after checking the current one, so a session left
  // open on a shared computer can't be used to take over the account.
  async changePassword(actor: Actor, request: PasswordChangeRequest): Promise<Account> {
    const errors = await validate(request);
    if (errors.length > 0) {
      throw InvalidParamsError.fromClassValidator(errors);
    }

    const account = await this.accounts.getById(actor.id);

    // A wrong current password is a field error (400), not 401: the session itself is valid.
    if (!(await verifyPassword(request.currentPassword, account.passwordHash))) {
      throw new InvalidParamsError([{ field: 'currentPassword', messages: ['current password is incorrect'] }]);
    }
    if (request.newPassword === request.currentPassword) {
      throw new InvalidParamsError([
        { field: 'newPassword', messages: ['new password must be different from the current one'] },
      ]);
    }

    account.passwordHash = await hashPassword(request.newPassword);
    account.updatedAt = new Date();

    const updated = await this.accounts.update(account);

    await this.events.publish(
      new AccountPasswordChangedEvent({
        entityId: updated.id,
        payload: {},
        actor,
      }),
    );

    return updated;
  }
}
