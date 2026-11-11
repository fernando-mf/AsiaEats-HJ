import type { OrderLine, OrderStatus } from '#domain/ord/index.js';
import type { Fare } from './pricing.models.js';

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
