import type { Order } from '#domain/ord/index.js';
import type { BillingDetails, BillingService } from '#domain/prc/index.js';
import { AccountRole, type Actor } from '#domain/reg/index.js';

// An order with its billing details, as the orders routes return it.
export type OrderWithBilling = Order & { billing: BillingDetails | null };

// withBilling joins ORD's orders with PRC's billing here, in the application layer, so neither
// domain module depends on the other. The orders are the ones the caller's role-scoped query
// returned (R-PRC-04), and the billing is looked up for all of them in one call. Couriers never
// see billing details: they may not see a customer's charges.
export async function withBilling(
  orders: readonly Order[],
  actor: Actor,
  billing: BillingService,
): Promise<OrderWithBilling[]> {
  if (actor.role === AccountRole.Courier) {
    return orders.map(order => ({ ...order, billing: null }));
  }

  const details = await billing.billingFor(orders);
  return orders.map(order => ({ ...order, billing: details.get(order.id) ?? null }));
}
