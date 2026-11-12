import { plainToInstance, Type } from 'class-transformer';
import { IsDefined, IsEnum, IsLatitude, IsLongitude, IsOptional, ValidateNested } from 'class-validator';
import { Event } from '#domain/events/index.js';
import type { Account } from './accounts.models.js';

export enum CourierStatus {
  Offline = 'offline',
  Idle = 'idle',
  Assigned = 'assigned',
  Carrying = 'carrying',
}

export class Position {
  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;
}

export class CourierPositionUpdateRequest {
  @IsDefined()
  @ValidateNested()
  @Type(() => Position)
  position: Position;

  static initialize(raw: CourierPositionUpdateRequest): CourierPositionUpdateRequest {
    return plainToInstance(CourierPositionUpdateRequest, raw);
  }
}

export class Courier {
  account: Account;
  position: Position | null;
  status: CourierStatus;
  createdAt: Date;
  updatedAt: Date;

  toJSON() {
    return {
      account: this.account.toJSON(),
      position: this.position,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export class CourierSummary {
  id: string;
  position: Position | null;
  status: CourierStatus;
}

export class CourierSearchRequest {
  @IsOptional()
  @IsEnum(CourierStatus)
  status?: CourierStatus;

  static initialize(raw: CourierSearchRequest): CourierSearchRequest {
    return plainToInstance(CourierSearchRequest, raw);
  }
}

export type CourierFilter = {
  status?: CourierStatus;
};

export class CourierCreatedEvent extends Event<ReturnType<Courier['toJSON']>> {
  readonly entityType = 'courier';
  readonly eventType = 'courier.created';
}

export class CourierStatusChangedEvent extends Event<{
  previousStatus: CourierStatus;
  newStatus: CourierStatus;
}> {
  readonly entityType = 'courier';
  readonly eventType = 'courier.status_changed';
}
