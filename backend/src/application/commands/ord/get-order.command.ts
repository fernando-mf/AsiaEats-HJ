import type { OrdersService } from '#domain/ord/index.js';
import type { BillingService } from '#domain/prc/index.js';
import type { Actor } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';
import { type OrderWithBilling, withBilling } from './order-billing.js';

export class GetOrderCommand implements Command<OrderWithBilling> {
  readonly name = 'GetOrderCommand';
  readonly readOnly = true;

  constructor(
    private readonly ordersService: OrdersService,
    private readonly billingService: BillingService,
    private readonly actor: Actor,
    private readonly id: string,
  ) {}

  async execute(): Promise<OrderWithBilling> {
    const order = await this.ordersService.getById(this.actor, this.id);
    const [withDetails] = await withBilling([order], this.actor, this.billingService);
    return withDetails;
  }
}
