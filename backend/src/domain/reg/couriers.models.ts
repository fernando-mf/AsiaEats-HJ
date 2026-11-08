import { Event } from '#domain/events/index.js';
import type { Account } from './accounts.models.js';

export enum CourierStatus {
  Offline = 'offline',
  Idle = 'idle',
  Assigned = 'assigned',
  Carrying = 'carrying',
}

export class Position {
  latitude: number;
  longitude: number;
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

export class CourierCreatedEvent extends Event<ReturnType<Courier['toJSON']>> {
  readonly entityType = 'courier';
  readonly eventType = 'courier.created';
}
