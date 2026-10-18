import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Event } from './events.models.js';

type OrderPlacedPayload = { total: number };

class OrderPlacedEvent extends Event<OrderPlacedPayload> {
  readonly entityType = 'order';
  readonly eventType = 'order.placed';
}

const occurredAt = new Date('2026-10-18T04:00:00.000Z');

describe('Event', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(occurredAt);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('assigns the entity, payload, actor, and event names from the constructor', () => {
    const event = new OrderPlacedEvent({
      entityId: 'order-1',
      payload: { total: 42 },
      actorId: 'user-1',
    });

    expect(event.entityId).toBe('order-1');
    expect(event.payload).toEqual({ total: 42 });
    expect(event.actorId).toBe('user-1');
    expect(event.entityType).toBe('order');
    expect(event.eventType).toBe('order.placed');

    expect(event.occurredAt).toEqual(occurredAt); // timestamp taken in the constructor
    expect(event.id).toBeDefined(); // id must be populated
  });

  it('defaults a missing actor to null', () => {
    const event = new OrderPlacedEvent({
      entityId: 'order-1',
      payload: { total: 42 },
    });

    expect(event.actorId).toBeNull();
  });

  it('generates a distinct id for each event', () => {
    const params = { entityId: 'order-1', payload: { total: 42 } };

    const event1 = new OrderPlacedEvent(params);
    const event2 = new OrderPlacedEvent(params);

    expect(event1.id).not.toBe(event2.id);
  });
});
