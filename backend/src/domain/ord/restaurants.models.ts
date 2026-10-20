import { plainToInstance, Type } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Event } from '#domain/events/index.js';

export enum RestaurantStatus {
  Open = 'open',
  Paused = 'paused',
  Closed = 'closed',
}

export class Position {
  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;
}

export class RestaurantCreationRequest {
  @IsString()
  @MinLength(3)
  name: string;

  @IsOptional()
  @IsEnum(RestaurantStatus)
  status?: RestaurantStatus;

  @IsDefined()
  @ValidateNested()
  @Type(() => Position)
  position: Position;

  static initialize(raw: RestaurantCreationRequest): RestaurantCreationRequest {
    return plainToInstance(RestaurantCreationRequest, raw);
  }
}

export class RestaurantUpdateRequest {
  @IsString()
  @MinLength(3)
  name: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => Position)
  position: Position;

  static initialize(raw: RestaurantUpdateRequest): RestaurantUpdateRequest {
    return plainToInstance(RestaurantUpdateRequest, raw);
  }
}

export class Restaurant {
  id: string;
  ownerId: string;
  name: string;
  status: RestaurantStatus;
  position: Position;
  createdAt: Date;
  updatedAt: Date;
}

export class RestaurantCreatedEvent extends Event<Restaurant> {
  readonly entityType = 'restaurant';
  readonly eventType = 'restaurant.created';
}

export class RestaurantUpdatedEvent extends Event<Restaurant> {
  readonly entityType = 'restaurant';
  readonly eventType = 'restaurant.updated';
}
