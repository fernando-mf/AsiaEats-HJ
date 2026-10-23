import { plainToInstance } from 'class-transformer';
import { IsEnum, IsString, MinLength } from 'class-validator';
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
