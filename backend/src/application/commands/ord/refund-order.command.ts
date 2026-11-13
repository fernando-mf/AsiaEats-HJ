import type { OrdersService } from '#domain/ord/index.js';
import type { BillingService } from '#domain/prc/index.js';
import type { Actor } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';
import { type OrderWithBilling, withBilling } from './order-billing.js';

// RefundOrderCommand refunds a delivered order and returns it with its billing details, read in
// the same transaction, so the response already shows the refund entry it recorded (R-PRC-05).
export class RefundOrderCommand implements Command<OrderWithBilling> {
  readonly name = 'RefundOrderCommand';

  constructor(
    private readonly ordersService: OrdersService,
    private readonly billingService: BillingService,
    private readonly actor: Actor,
    private readonly id: string,
  ) {}

  async execute(): Promise<OrderWithBilling> {
    const order = await this.ordersService.refund(this.actor, this.id);
    const [withDetails] = await withBilling([order], this.actor, this.billingService);
    return withDetails;
  }
}
