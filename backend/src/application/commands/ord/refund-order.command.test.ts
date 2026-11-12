import { describe, expect, it, vi } from 'vitest';
import { type Order, type OrdersService, OrderStatus } from '#domain/ord/index.js';
import type { BillingDetails, BillingService } from '#domain/prc/index.js';
import { AccountRole } from '#domain/reg/index.js';
import { RefundOrderCommand } from './refund-order.command.js';

const operator = { id: 'operator-1', role: AccountRole.Operator };
const refunded = { id: 'order-1', status: OrderStatus.Refunded } as Order;
const details = { orderId: 'order-1', ledger: { refund: { amount: 17 } } } as BillingDetails;

describe('RefundOrderCommand', () => {
  it('refunds the order, then returns it with its billing details, refund included', async () => {
    const orders = { refund: vi.fn(async () => refunded) } as unknown as OrdersService;
    const billing = { billingFor: vi.fn(async () => new Map([['order-1', details]])) } as unknown as BillingService;

    const result = await new RefundOrderCommand(orders, billing, operator, 'order-1').execute();

    expect(orders.refund).toHaveBeenCalledWith(operator, 'order-1');
    expect(billing.billingFor).toHaveBeenCalledWith([refunded]);
    expect(result).toEqual({ ...refunded, billing: details });
  });

  it('looks up no billing when the refund is refused', async () => {
    const orders = { refund: vi.fn().mockRejectedValue(new Error('not delivered')) } as unknown as OrdersService;
    const billing = { billingFor: vi.fn() } as unknown as BillingService;

    await expect(new RefundOrderCommand(orders, billing, operator, 'order-1').execute()).rejects.toThrow(
      'not delivered',
    );
    expect(billing.billingFor).not.toHaveBeenCalled();
  });
});
