import { v7 as uuidv7 } from 'uuid';

type EventParams<TPayload extends object> = {
  entityId: string;
  payload: TPayload;
  actorId?: string | null;
};

// Event represents a domain event. Other modules' events inherit from this one
export abstract class Event<TPayload extends object = Record<string, unknown>> {
  readonly id = uuidv7();

  abstract readonly entityType: string;
  abstract readonly eventType: string;
  readonly occurredAt = new Date();

  readonly entityId: string;
  readonly payload: TPayload;
  readonly actorId: string | null;

  constructor(params: EventParams<TPayload>) {
    this.entityId = params.entityId;
    this.payload = params.payload;
    this.actorId = params.actorId ?? null;
  }
}
