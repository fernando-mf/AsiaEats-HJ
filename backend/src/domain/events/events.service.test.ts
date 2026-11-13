import { describe, expect, it, vi } from 'vitest';
import { Event } from './events.models.js';
import { type EventRepository, EventsService } from './events.service.js';

class SomethingHappenedEvent extends Event {
  readonly entityType = 'thing';
  readonly eventType = 'thing.happened';
}

class SomethingElseEvent extends Event {
  readonly entityType = 'thing';
  readonly eventType = 'thing.else';
}

function newEvents() {
  const calls: string[] = [];
  const repository = {
    append: vi.fn(async () => {
      calls.push('append');
    }),
  } as unknown as EventRepository;

  return { service: new EventsService(repository), repository, calls };
}

const happened = () => new SomethingHappenedEvent({ entityId: 'thing-1' });

describe('EventsService', () => {
  it('records the event, then calls the handlers of its type, in the order they subscribed', async () => {
    const { service, calls } = newEvents();
    const first = vi.fn(() => {
      calls.push('first');
    });
    service.subscribe('thing.happened', first);
    service.subscribe('thing.happened', () => {
      calls.push('second');
    });
    const event = happened();

    await service.publish(event);

    expect(calls).toEqual(['append', 'first', 'second']);
    expect(first).toHaveBeenCalledWith(event);
  });

  it('does not call handlers subscribed to another event type', async () => {
    const { service } = newEvents();
    const handler = vi.fn();
    service.subscribe('thing.happened', handler);

    await service.publish(new SomethingElseEvent({ entityId: 'thing-1' }));

    expect(handler).not.toHaveBeenCalled();
  });

  it("logs a handler's failure and goes on with the next handler", async () => {
    const { service } = newEvents();
    const next = vi.fn();
    service.subscribe('thing.happened', vi.fn().mockRejectedValue(new Error('dispatch down')));
    service.subscribe('thing.happened', next);

    await expect(service.publish(happened())).resolves.toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
  });

  it("passes a critical handler's failure on, so the command's transaction rolls back", async () => {
    const { service } = newEvents();
    service.subscribe('thing.happened', vi.fn().mockRejectedValue(new Error('ledger down')), { critical: true });

    await expect(service.publish(happened())).rejects.toThrow('ledger down');
  });

  it('works without handlers', async () => {
    const { service, repository } = newEvents();

    await service.publish(happened());

    expect(repository.append).toHaveBeenCalledOnce();
  });
});
