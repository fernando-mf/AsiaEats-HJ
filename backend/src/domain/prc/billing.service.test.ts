import { describe, expect, it, vi } from 'vitest';
import { type Order, OrderStatus } from '#domain/ord/index.js';
import { BillingService } from './billing.service.js';
import { LedgerEntry, LedgerEntryKind } from './ledger.models.js';
import type { LedgerRepository } from './ledger.service.js';
import { FareComponentKind } from './pricing.models.js';

const placedAt = new Date('2026-11-11T18:00:00Z');
const deliveredAt = new Date('2026-11-11T18:40:00Z');

function order(id: string, status: OrderStatus): Order {
  return {
    id,
    customerId: 'customer-1',
    customerName: 'Alice Chen',
    restaurantId: 'restaurant-1',
    status,
    deliveryAddress: null,
    lines: [{ id: `${id}-line`, orderId: id, menuItemId: 'item-1', name: 'Mapo Tofu', unitPrice: 12.75, quantity: 1 }],
    createdAt: placedAt,
    updatedAt: deliveredAt,
  };
}

// A charge as the ledger records it: Mapo Tofu's fare for a delivered order, nothing otherwise.
function charge(orderId: string, orderStatus: OrderStatus): LedgerEntry {
  const delivered = orderStatus === OrderStatus.Delivered;
  return Object.assign(new LedgerEntry(), {
    id: `${orderId}-charge`,
    orderId,
    kind: LedgerEntryKind.Charge,
    orderStatus,
    customerId: 'customer-1',
    restaurantId: 'restaurant-1',
    subtotal: delivered ? 12.75 : 0,
    deliveryFee: delivered ? 3 : 0,
    serviceFee: delivered ? 2 : 0,
    smallOrderSurcharge: delivered ? 2.5 : 0,
    total: delivered ? 20.25 : 0,
    orderPlacedAt: placedAt,
    orderClosedAt: deliveredAt,
    recordedAt: deliveredAt,
  });
}

function newBilling(entries: LedgerEntry[]) {
  const ledger = {
    findByOrders: vi.fn(async (ids: readonly string[]) => entries.filter(entry => ids.includes(entry.orderId))),
  } as unknown as LedgerRepository;

  return { service: new BillingService(ledger), ledger };
}

describe('BillingService.billingFor', () => {
  it("returns a delivered order's summary and ledger data, keyed by order id", async () => {
    const { service } = newBilling([charge('order-1', OrderStatus.Delivered)]);

    const billing = await service.billingFor([order('order-1', OrderStatus.Delivered)]);
    const details = billing.get('order-1')!;

    expect(details.summary.lines).toHaveLength(1);
    expect(details.summary.fare.total).toBe(20.25);
    expect(details.summary.fare.amountOf(FareComponentKind.SmallOrderSurcharge)).toBe(2.5);
    expect(details.ledger).toEqual({
      finalState: OrderStatus.Delivered,
      placedAt,
      deliveredAt,
      totalCharge: 20.25,
      refund: null,
    });
  });

  it('shows a refunded order as refunded, keeping the original charge', async () => {
    const refundedAt = new Date('2026-11-12T09:00:00Z');
    const refund = Object.assign(new LedgerEntry(), {
      ...charge('order-1', OrderStatus.Delivered),
      id: 'order-1-refund',
      kind: LedgerEntryKind.Refund,
      orderStatus: OrderStatus.Refunded,
      subtotal: -12.75,
      deliveryFee: -3,
      serviceFee: -2,
      smallOrderSurcharge: -2.5,
      total: -20.25,
      orderClosedAt: refundedAt,
      recordedAt: refundedAt,
    });
    const { service } = newBilling([charge('order-1', OrderStatus.Delivered), refund]);

    const details = (await service.billingFor([order('order-1', OrderStatus.Refunded)])).get('order-1')!;

    expect(details.summary.fare.total).toBe(20.25);
    expect(details.ledger).toEqual({
      finalState: OrderStatus.Refunded,
      placedAt,
      deliveredAt,
      totalCharge: 20.25,
      refund: { amount: 20.25, refundedAt },
    });
  });

  it('leaves out orders that are in progress, rejected or cancelled', async () => {
    const { service } = newBilling([
      charge('order-1', OrderStatus.Delivered),
      charge('order-3', OrderStatus.Rejected),
      charge('order-4', OrderStatus.Cancelled),
    ]);

    const billing = await service.billingFor([
      order('order-1', OrderStatus.Delivered),
      order('order-2', OrderStatus.Preparing),
      order('order-3', OrderStatus.Rejected),
      order('order-4', OrderStatus.Cancelled),
    ]);

    expect([...billing.keys()]).toEqual(['order-1']);
  });

  it('only reports the orders it was given, and reads the ledger once for all of them', async () => {
    // order-2 is in the ledger, but the caller's role-scoped query did not return it.
    const { service, ledger } = newBilling([
      charge('order-1', OrderStatus.Delivered),
      charge('order-2', OrderStatus.Delivered),
      charge('order-3', OrderStatus.Delivered),
    ]);

    const billing = await service.billingFor([
      order('order-1', OrderStatus.Delivered),
      order('order-3', OrderStatus.Delivered),
    ]);

    expect([...billing.keys()]).toEqual(['order-1', 'order-3']);
    expect(ledger.findByOrders).toHaveBeenCalledOnce();
    expect(ledger.findByOrders).toHaveBeenCalledWith(['order-1', 'order-3']);
  });

  it('reads nothing when given no orders', async () => {
    const { service, ledger } = newBilling([]);

    expect((await service.billingFor([])).size).toBe(0);
    expect(ledger.findByOrders).not.toHaveBeenCalled();
  });
});
