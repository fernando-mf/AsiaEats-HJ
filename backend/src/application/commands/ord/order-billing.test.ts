import { describe, expect, it, vi } from 'vitest';
import { type Order, OrderStatus } from '#domain/ord/index.js';
import type { BillingDetails, BillingService } from '#domain/prc/index.js';
import { AccountRole } from '#domain/reg/index.js';
import { withBilling } from './order-billing.js';

function order(id: string, status: OrderStatus): Order {
  return {
    id,
    customerId: 'customer-1',
    customerName: 'Alice Chen',
    restaurantId: 'restaurant-1',
    status,
    deliveryAddress: null,
    lines: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const delivered = order('order-1', OrderStatus.Delivered);
const preparing = order('order-2', OrderStatus.Preparing);
const details = { orderId: 'order-1' } as BillingDetails;

function newBilling() {
  return {
    billingFor: vi.fn(async () => new Map([['order-1', details]])),
  } as unknown as BillingService;
}

describe('withBilling', () => {
  it('adds the billing details of delivered orders, and null to the others', async () => {
    const billing = newBilling();
    const customer = { id: 'customer-1', role: AccountRole.Customer };

    const orders = await withBilling([delivered, preparing], customer, billing);

    expect(orders.map(o => o.billing)).toEqual([details, null]);
    expect(orders[0]).toMatchObject({ id: 'order-1', status: OrderStatus.Delivered });
  });

  it('looks the billing up once, for exactly the orders the role-scoped query returned', async () => {
    const billing = newBilling();
    const operator = { id: 'operator-1', role: AccountRole.Operator };

    await withBilling([delivered, preparing], operator, billing);

    expect(billing.billingFor).toHaveBeenCalledOnce();
    expect(billing.billingFor).toHaveBeenCalledWith([delivered, preparing]);
  });

  it('never gives billing details to a courier', async () => {
    const billing = newBilling();
    const courier = { id: 'courier-1', role: AccountRole.Courier };

    const orders = await withBilling([delivered], courier, billing);

    expect(orders[0].billing).toBeNull();
    expect(billing.billingFor).not.toHaveBeenCalled();
  });
});
