import { Event } from '#domain/events/index.js';
import type { Order, OrderLine, OrderStatus } from '#domain/ord/index.js';
import { Fare, FareComponentKind } from './pricing.models.js';

// A charge records what an order cost when it reached its final state; a refund (R-PRC-05) is
// a separate entry that reverses a delivered order's charge.
export enum LedgerEntryKind {
  Charge = 'charge',
  Refund = 'refund',
}

// LedgerEntry is one line of the ledger (R-PRC-03): an order, the final state it reached, when
// it was placed and closed, and what it was charged, with the fare's breakdown so the total can
// be checked by hand. Rejected and cancelled orders are recorded too, with nothing charged.
export class LedgerEntry {
  id: string;
  orderId: string;
  kind: LedgerEntryKind;
  // The order's status when the entry was recorded: delivered, rejected or cancelled.
  orderStatus: OrderStatus;
  customerId: string;
  restaurantId: string;
  // In dollars.
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  smallOrderSurcharge: number;
  total: number;
  orderPlacedAt: Date;
  // When the order reached the status above.
  orderClosedAt: Date;
  recordedAt: Date;
}

// OrderSummary is shown to the customer after delivery (R-PRC-02): what was ordered and what it
// cost, part by part.
export type OrderSummary = {
  orderId: string;
  restaurantId: string;
  lines: OrderLine[];
  fare: Fare;
  placedAt: Date;
  deliveredAt: Date;
};

// BillingDetails is what an order shows about its billing once it is delivered (R-PRC-02,
// R-PRC-03): its summary, and its ledger data.
export type BillingDetails = {
  orderId: string;
  summary: OrderSummary;
  ledger: {
    // delivered, or refunded once refunded.
    finalState: OrderStatus;
    placedAt: Date;
    deliveredAt: Date;
    // What the delivery was charged; a refund doesn't change it.
    totalCharge: number;
    // Set once the order is refunded (R-PRC-05).
    refund: { amount: number; refundedAt: Date } | null;
  };
};

// summaryOf builds a delivered order's summary from its charge: the fare it was charged, even if
// the pricing values have changed since.
export function summaryOf(order: Order, charge: LedgerEntry): OrderSummary {
  const parts = [
    { kind: FareComponentKind.Subtotal, amount: charge.subtotal },
    { kind: FareComponentKind.DeliveryFee, amount: charge.deliveryFee },
    { kind: FareComponentKind.ServiceFee, amount: charge.serviceFee },
    { kind: FareComponentKind.SmallOrderSurcharge, amount: charge.smallOrderSurcharge },
  ];

  return {
    orderId: order.id,
    restaurantId: order.restaurantId,
    lines: order.lines,
    // The surcharge only appears when it was charged, as when the fare was computed.
    fare: new Fare(parts.filter(part => part.kind !== FareComponentKind.SmallOrderSurcharge || part.amount > 0)),
    placedAt: charge.orderPlacedAt,
    deliveredAt: charge.orderClosedAt,
  };
}

// Recorded each time an entry is added to the ledger (R-PRC-03).
export class LedgerEntryRecordedEvent extends Event<{
  orderId: string;
  kind: LedgerEntryKind;
  orderStatus: OrderStatus;
  total: number;
}> {
  readonly entityType = 'ledger_entry';
  readonly eventType = 'ledger_entry.recorded';
}

// Recorded when a delivered order's summary is created (R-PRC-02). It belongs to the order, so it
// appears in the order's event history next to its status changes.
export class OrderSummaryCreatedEvent extends Event<{ total: number }> {
  readonly entityType = 'order';
  readonly eventType = 'order.summary_created';
}
