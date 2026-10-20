import { plainToInstance, Type } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Min,
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

export class RestaurantStatusUpdateRequest {
  @IsEnum(RestaurantStatus)
  status: RestaurantStatus;

  static initialize(raw: RestaurantStatusUpdateRequest): RestaurantStatusUpdateRequest {
    return plainToInstance(RestaurantStatusUpdateRequest, raw);
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

export class RestaurantStatusChangedEvent extends Event<{
  previousStatus: RestaurantStatus;
  newStatus: RestaurantStatus;
}> {
  readonly entityType = 'restaurant';
  readonly eventType = 'restaurant.status_changed';
}

export enum MenuItemStatus {
  Available = 'available',
  SoldOut = 'sold_out',
}

export class MenuItemCreationRequest {
  @IsString()
  @MinLength(1)
  name: string;

  // price is expressed in the restaurant's currency, with up to 2 decimals.
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsOptional()
  @IsEnum(MenuItemStatus)
  status?: MenuItemStatus;

  static initialize(raw: MenuItemCreationRequest): MenuItemCreationRequest {
    return plainToInstance(MenuItemCreationRequest, raw);
  }
}

export class MenuItemUpdateRequest {
  @IsString()
  @MinLength(1)
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsEnum(MenuItemStatus)
  status: MenuItemStatus;

  static initialize(raw: MenuItemUpdateRequest): MenuItemUpdateRequest {
    return plainToInstance(MenuItemUpdateRequest, raw);
  }
}

export class MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  price: number;
  status: MenuItemStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class MenuItemCreatedEvent extends Event<MenuItem> {
  readonly entityType = 'menu_item';
  readonly eventType = 'menu_item.created';
}

export class MenuItemUpdatedEvent extends Event<MenuItem> {
  readonly entityType = 'menu_item';
  readonly eventType = 'menu_item.updated';
}
