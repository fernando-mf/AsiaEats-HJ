import { Injectable } from '@nestjs/common';
import { type Order, OrderStatus } from '#domain/ord/index.js';
import { type BillingDetails, type LedgerEntry, LedgerEntryKind, summaryOf } from './ledger.models.js';
import { LedgerRepository } from './ledger.service.js';

// BillingService tells what orders were billed: their summary and ledger data (R-PRC-02,
// R-PRC-03).
@Injectable()
export class BillingService {
  constructor(private readonly ledger: LedgerRepository) {}

  // billingFor returns the billing details of each of these orders that was delivered (and possibly
  // refunded since), keyed by order id; other orders are absent from the map. It takes the orders themselves, as the
  // caller's role-scoped order query returned them (R-PRC-04), so it can't be used to read the
  // billing of an order the caller may not see. It reads the ledger once, however many orders.
  async billingFor(orders: readonly Order[]): Promise<Map<string, BillingDetails>> {
    const billing = new Map<string, BillingDetails>();
    if (orders.length === 0) return billing;

    const charges = new Map<string, LedgerEntry>();
    const refunds = new Map<string, LedgerEntry>();
    for (const entry of await this.ledger.findByOrders(orders.map(order => order.id))) {
      if (entry.kind === LedgerEntryKind.Refund) refunds.set(entry.orderId, entry);
      // Rejected and cancelled orders are in the ledger with nothing charged, but have no billing.
      else if (entry.orderStatus === OrderStatus.Delivered) charges.set(entry.orderId, entry);
    }

    for (const order of orders) {
      const charge = charges.get(order.id);
      if (!charge) continue;
      const refund = refunds.get(order.id);

      billing.set(order.id, {
        orderId: order.id,
        summary: summaryOf(order, charge),
        ledger: {
          finalState: refund ? refund.orderStatus : charge.orderStatus,
          placedAt: charge.orderPlacedAt,
          deliveredAt: charge.orderClosedAt,
          totalCharge: charge.total,
          refund: refund ? { amount: -refund.total, refundedAt: refund.orderClosedAt } : null,
        },
      });
    }

    return billing;
  }
}
