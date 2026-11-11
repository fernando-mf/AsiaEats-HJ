import { describe, expect, it, vi } from 'vitest';
import { Event } from './events.models.js';
import { type EventRepository, type EventSubscriber, EventsService } from './events.service.js';

class SomethingHappenedEvent extends Event {
  readonly entityType = 'thing';
  readonly eventType = 'thing.happened';
}

describe('EventsService', () => {
  it('records the event, then notifies every subscriber with it, in order', async () => {
    const calls: string[] = [];
    const repository = {
      append: vi.fn(async () => {
        calls.push('append');
      }),
    } as unknown as EventRepository;
    const subscriber = (name: string): EventSubscriber => ({
      handle: vi.fn(async () => {
        calls.push(name);
      }),
    });
    const first = subscriber('first');
    const second = subscriber('second');
    const event = new SomethingHappenedEvent({ entityId: 'thing-1' });

    await new EventsService(repository, [first, second]).publish(event);

    expect(calls).toEqual(['append', 'first', 'second']);
    expect(first.handle).toHaveBeenCalledWith(event);
  });

  it("passes a subscriber's failure on, so the command's transaction rolls back", async () => {
    const repository = { append: vi.fn() } as unknown as EventRepository;
    const failing: EventSubscriber = { handle: vi.fn().mockRejectedValue(new Error('ledger down')) };

    await expect(
      new EventsService(repository, [failing]).publish(new SomethingHappenedEvent({ entityId: 'thing-1' })),
    ).rejects.toThrow('ledger down');
  });

  it('works without subscribers', async () => {
    const repository = { append: vi.fn() } as unknown as EventRepository;

    await new EventsService(repository).publish(new SomethingHappenedEvent({ entityId: 'thing-1' }));

    expect(repository.append).toHaveBeenCalledOnce();
  });
});
