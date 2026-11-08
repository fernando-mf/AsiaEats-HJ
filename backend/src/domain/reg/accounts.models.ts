import { plainToInstance, Transform } from 'class-transformer';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { Event } from '#domain/events/index.js';

export enum AccountRole {
  Customer = 'customer',
  Restaurant = 'restaurant',
  Courier = 'courier',
  Operator = 'operator',
}

export class AccountCreationRequest {
  @IsEnum(AccountRole)
  role: AccountRole;

  @IsString()
  username: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(3)
  name: string;

  static initialize(raw: AccountCreationRequest): AccountCreationRequest {
    return plainToInstance(AccountCreationRequest, raw);
  }
}

export class LoginRequest {
  @IsString()
  username: string;

  @IsString()
  password: string;

  static initialize(raw: LoginRequest): LoginRequest {
    return plainToInstance(LoginRequest, raw);
  }
}

export class AccountUpdateRequest {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  static initialize(raw: AccountUpdateRequest): AccountUpdateRequest {
    return plainToInstance(AccountUpdateRequest, raw);
  }
}

export class PasswordChangeRequest {
  @IsString()
  currentPassword: string;

  // Same rule as registration.
  @IsString()
  @MinLength(8)
  newPassword: string;

  static initialize(raw: PasswordChangeRequest): PasswordChangeRequest {
    return plainToInstance(PasswordChangeRequest, raw);
  }
}

export class Account {
  id: string;
  name: string;
  username: string;
  role: AccountRole;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      username: this.username,
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export type Actor = Pick<Account, 'id' | 'role'>;

// AccountCreatedEvent is a generic creation event. Some specialized roles like `Customer`
// have their own CustomerCreatedEvent. Non specialized roles use this.
export class AccountCreatedEvent extends Event<ReturnType<Account['toJSON']>> {
  readonly entityType = 'account';
  readonly eventType = 'account.created';
}

export class AccountUpdatedEvent extends Event<ReturnType<Account['toJSON']>> {
  readonly entityType = 'account';
  readonly eventType = 'account.updated';
}

// The payload is empty on purpose: the event records that the password changed, never the hash.
export class AccountPasswordChangedEvent extends Event<Record<string, never>> {
  readonly entityType = 'account';
  readonly eventType = 'account.password_changed';
}
