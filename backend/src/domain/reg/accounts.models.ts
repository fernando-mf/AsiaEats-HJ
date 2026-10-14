import { plainToInstance } from 'class-transformer';
import { IsEnum, IsString, MinLength } from 'class-validator';

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
