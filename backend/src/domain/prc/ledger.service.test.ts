import { describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '#domain/errors.js';
import type { EventsService } from '#domain/events/index.js';
import {
  type Order,
  OrderPlacedEvent,
  type OrderRepository,
  OrderStatus,
  OrderStatusChangedEvent,
} from '#domain/ord/index.js';
import { AccountRole } from '#domain/reg/index.js';
import { LedgerEntry, LedgerEntryKind } from './ledger.models.js';
import { type LedgerRepository, LedgerService } from './ledger.service.js';
import { FareComponentKind } from './pricing.models.js';
import { PricingService, type PricingSource } from './pricing.service.js';

const actor = { id: 'courier-1', role: AccountRole.Courier };
const placedAt = new Date('2026-11-11T18:00:00Z');

function order(status: OrderStatus, lines = [{ unitPrice: 12.75, quantity: 1 }]): Order {
  return {
    id: 'order-1',
    customerId: 'customer-1',
    customerName: 'Alice Chen',
    restaurantId: 'restaurant-1',
    status,
    deliveryAddress: null,
    lines: lines.map((line, index) => ({
      id: `line-${index}`,
      orderId: 'order-1',
      menuItemId: `item-${index}`,
      name: 'Mapo Tofu',
      ...line,
    })),
    createdAt: placedAt,
    updatedAt: placedAt,
  };
}

function statusChanged(previousStatus: OrderStatus, newStatus: OrderStatus) {
  return new OrderStatusChangedEvent({ entityId: 'order-1', payload: { previousStatus, newStatus }, actor });
}

// A ledger kept in memory, and the pricing values from backend/config/seed.json.
function newLedger(current: Order) {
  const entries: LedgerEntry[] = [];
  const ledger = {
    record: vi.fn(async (entry: LedgerEntry) => {
      entry.id = `entry-${entries.length + 1}`;
      entries.push(entry);
      return entry;
    }),
    findByOrder: vi.fn(async (orderId: string, kind: LedgerEntryKind) =>
      entries.find(entry => entry.orderId === orderId && entry.kind === kind),
    ),
    list: vi.fn(async () => [...entries].reverse()),
  } as unknown as LedgerRepository;
  const orders = { getById: vi.fn(async () => current) } as unknown as OrderRepository;
  const source: PricingSource = {
    load: async () => ({ deliveryFee: 3, serviceFee: 2, smallOrderThreshold: 15, smallOrderSurcharge: 2.5 }),
  };

  const events = { subscribe: vi.fn(), publish: vi.fn() } as unknown as EventsService;

  return { service: new LedgerService(ledger, orders, new PricingService(source), events), entries, events };
}

describe('LedgerService', () => {
  it('subscribes to the published events when the app starts', () => {
    const { service, events } = newLedger(order(OrderStatus.Placed));

    service.onModuleInit();

    expect(events.subscribe).toHaveBeenCalledWith(service);
  });

  it("charges a delivered order its fare and records the order's final state and timestamps", async () => {
    const { service, entries } = newLedger(order(OrderStatus.Delivered));
    const event = statusChanged(OrderStatus.PickedUp, OrderStatus.Delivered);

    await service.handle(event);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      orderId: 'order-1',
      kind: LedgerEntryKind.Charge,
      orderStatus: OrderStatus.Delivered,
      customerId: 'customer-1',
      restaurantId: 'restaurant-1',
      // Mapo Tofu: 12.75 + 3.00 + 2.00 + 2.50 = 20.25
      subtotal: 12.75,
      deliveryFee: 3,
      serviceFee: 2,
      smallOrderSurcharge: 2.5,
      total: 20.25,
      orderPlacedAt: placedAt,
      orderClosedAt: event.occurredAt,
    });
  });

  it('records a rejected or cancelled order with nothing charged', async () => {
    for (const status of [OrderStatus.Rejected, OrderStatus.Cancelled]) {
      const { service, entries } = newLedger(order(status));

      await service.handle(statusChanged(OrderStatus.Placed, status));

      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({ orderStatus: status, subtotal: 0, total: 0 });
    }
  });

  it('ignores orders that are still in progress, and other events', async () => {
    const { service, entries } = newLedger(order(OrderStatus.Accepted));

    await service.handle(statusChanged(OrderStatus.Placed, OrderStatus.Accepted));
    await service.handle(statusChanged(OrderStatus.Ready, OrderStatus.PickedUp));
    await service.handle(new OrderPlacedEvent({ entityId: 'order-1', actor }));

    expect(entries).toHaveLength(0);
  });

  it('records an order only once', async () => {
    const { service, entries } = newLedger(order(OrderStatus.Delivered));
    const event = statusChanged(OrderStatus.PickedUp, OrderStatus.Delivered);

    await service.handle(event);
    await service.handle(event);

    expect(entries).toHaveLength(1);
  });

  it("builds a delivered order's summary from the fare it was charged", async () => {
    const { service } = newLedger(order(OrderStatus.Delivered, [{ unitPrice: 9.5, quantity: 2 }]));
    await service.handle(statusChanged(OrderStatus.PickedUp, OrderStatus.Delivered));

    const summary = await service.getSummary('order-1');

    // Pork Dumplings x2: 19.00 + 3.00 + 2.00 = 24.00, with no surcharge
    expect(summary.fare.total).toBe(24);
    expect(summary.fare.components.map(component => component.kind)).toEqual([
      FareComponentKind.Subtotal,
      FareComponentKind.DeliveryFee,
      FareComponentKind.ServiceFee,
    ]);
    expect(summary.lines).toHaveLength(1);
    expect(summary.placedAt).toEqual(placedAt);
  });

  it('has no summary for an order that was not delivered', async () => {
    const { service } = newLedger(order(OrderStatus.Cancelled));
    await service.handle(statusChanged(OrderStatus.Placed, OrderStatus.Cancelled));

    await expect(service.getSummary('order-1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('announces the recorded entry, then the summary of a delivered order, as the deliverer', async () => {
    const { service, events, entries } = newLedger(order(OrderStatus.Delivered));

    await service.handle(statusChanged(OrderStatus.PickedUp, OrderStatus.Delivered));

    const published = vi.mocked(events.publish).mock.calls.map(([event]) => event);
    expect(published.map(event => event.eventType)).toEqual(['ledger_entry.recorded', 'order.summary_created']);
    expect(published[0]).toMatchObject({
      entityType: 'ledger_entry',
      entityId: entries[0].id,
      payload: { orderId: 'order-1', kind: LedgerEntryKind.Charge, orderStatus: OrderStatus.Delivered, total: 20.25 },
      actor,
    });
    expect(published[1]).toMatchObject({ entityType: 'order', entityId: 'order-1', payload: { total: 20.25 }, actor });
  });

  it('announces the entry of a cancelled order, but no summary', async () => {
    const { service, events } = newLedger(order(OrderStatus.Cancelled));

    await service.handle(statusChanged(OrderStatus.Placed, OrderStatus.Cancelled));

    const published = vi.mocked(events.publish).mock.calls.map(([event]) => event.eventType);
    expect(published).toEqual(['ledger_entry.recorded']);
  });

  it('announces nothing when the order was already recorded', async () => {
    const { service, events } = newLedger(order(OrderStatus.Delivered));
    const event = statusChanged(OrderStatus.PickedUp, OrderStatus.Delivered);
    await service.handle(event);
    vi.mocked(events.publish).mockClear();

    await service.handle(event);

    expect(events.publish).not.toHaveBeenCalled();
  });

  it('lists every entry of the ledger, refunds included, most recent first', async () => {
    const { service, entries } = newLedger(order(OrderStatus.Delivered));
    await service.handle(statusChanged(OrderStatus.PickedUp, OrderStatus.Delivered));
    const refund = Object.assign(new LedgerEntry(), { ...entries[0], id: 'refund-1', kind: LedgerEntryKind.Refund });
    entries.push(refund);

    const listed = await service.list();

    expect(listed.map(entry => entry.kind)).toEqual([LedgerEntryKind.Refund, LedgerEntryKind.Charge]);
  });
});
