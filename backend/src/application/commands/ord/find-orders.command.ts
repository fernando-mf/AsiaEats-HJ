import type { OrderSearchRequest, OrdersService } from '#domain/ord/index.js';
import type { BillingService } from '#domain/prc/index.js';
import type { Actor } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';
import { type OrderWithBilling, withBilling } from './order-billing.js';

export class FindOrdersCommand implements Command<OrderWithBilling[]> {
  readonly name = 'FindOrdersCommand';
  readonly readOnly = true;

  constructor(
    private readonly ordersService: OrdersService,
    private readonly billingService: BillingService,
    private readonly actor: Actor,
    private readonly request: OrderSearchRequest,
  ) {}

  async execute(): Promise<OrderWithBilling[]> {
    const orders = await this.ordersService.find(this.actor, this.request);
    return withBilling(orders, this.actor, this.billingService);
  }
}
