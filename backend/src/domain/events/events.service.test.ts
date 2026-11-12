import { describe, expect, it, vi } from 'vitest';
import { Event } from './events.models.js';
import { type EventRepository, type EventSubscriber, EventsService } from './events.service.js';

class SomethingHappenedEvent extends Event {
  readonly entityType = 'thing';
  readonly eventType = 'thing.happened';
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

describe('EventsService', () => {
  it('records the event, then notifies every subscriber with it, in the order they subscribed', async () => {
    const { service, calls } = newEvents();
    const subscriber = (name: string): EventSubscriber => ({
      handle: vi.fn(async () => {
        calls.push(name);
      }),
    });
    const first = subscriber('first');
    const second = subscriber('second');
    service.subscribe(first);
    service.subscribe(second);
    const event = new SomethingHappenedEvent({ entityId: 'thing-1' });

    await service.publish(event);

    expect(calls).toEqual(['append', 'first', 'second']);
    expect(first.handle).toHaveBeenCalledWith(event);
  });

  it('notifies a subscriber once, even if it subscribes twice', async () => {
    const { service } = newEvents();
    const subscriber: EventSubscriber = { handle: vi.fn() };
    service.subscribe(subscriber);
    service.subscribe(subscriber);

    await service.publish(new SomethingHappenedEvent({ entityId: 'thing-1' }));

    expect(subscriber.handle).toHaveBeenCalledOnce();
  });

  it("passes a subscriber's failure on, so the command's transaction rolls back", async () => {
    const { service } = newEvents();
    service.subscribe({ handle: vi.fn().mockRejectedValue(new Error('ledger down')) });

    await expect(service.publish(new SomethingHappenedEvent({ entityId: 'thing-1' }))).rejects.toThrow('ledger down');
  });

  it('works without subscribers', async () => {
    const { service, repository } = newEvents();

    await service.publish(new SomethingHappenedEvent({ entityId: 'thing-1' }));

    expect(repository.append).toHaveBeenCalledOnce();
  });
});
