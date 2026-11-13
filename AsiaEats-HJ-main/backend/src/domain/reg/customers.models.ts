import { plainToInstance, Transform, Type } from 'class-transformer';
import { IsDefined, IsLatitude, IsLongitude, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Event } from '#domain/events/index.js';
import type { Account } from './accounts.models.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class AddressRequest {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  street: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(10)
  postalCode: string;

  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;
}

export class CustomerUpdateRequest {
  @IsDefined()
  @ValidateNested()
  @Type(() => AddressRequest)
  address: AddressRequest;

  static initialize(raw: CustomerUpdateRequest): CustomerUpdateRequest {
    return plainToInstance(CustomerUpdateRequest, raw);
  }
}

export class Address {
  street: string;
  city: string;
  postalCode: string;
  latitude: number;
  longitude: number;
}

export class Customer {
  account: Account;
  address: Address | null;
  createdAt: Date;
  updatedAt: Date;

  toJSON() {
    return {
      account: this.account.toJSON(),
      address: this.address,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export class CustomerCreatedEvent extends Event<ReturnType<Customer['toJSON']>> {
  readonly entityType = 'customer';
  readonly eventType = 'customer.created';
}

export class CustomerUpdatedEvent extends Event<ReturnType<Customer['toJSON']>> {
  readonly entityType = 'customer';
  readonly eventType = 'customer.updated';
}
