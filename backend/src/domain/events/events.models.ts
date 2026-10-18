import { plainToInstance } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { v7 as uuidv7 } from 'uuid';
import type { Actor } from '#domain/reg/index.js';

type EventParams<TPayload extends object> = {
  entityId: string;
  payload: TPayload;
  actor?: Actor | null;
};

// Event represents a domain event. Other modules' events inherit from this one
export abstract class Event<TPayload extends object = Record<string, unknown>> {
  readonly id = uuidv7();

  abstract readonly entityType: string;
  abstract readonly eventType: string;
  readonly occurredAt = new Date();

  readonly entityId: string;
  readonly payload: TPayload;
  readonly actor: Actor | null;

  constructor(params: EventParams<TPayload>) {
    this.entityId = params.entityId;
    this.payload = params.payload;
    this.actor = params.actor ?? null;
  }
}

// StoredEvent is the same as Event. Useful when a class is not needed.
export type StoredEvent = {
  id: string;
  entityType: string;
  entityId: string;
  eventType: string;
  payload: Record<string, unknown>;
  actor: Actor | null;
  occurredAt: Date;
};

export class GetByEntityQuery {
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  static initialize(raw: GetByEntityQuery): GetByEntityQuery {
    return plainToInstance(GetByEntityQuery, raw);
  }
}
