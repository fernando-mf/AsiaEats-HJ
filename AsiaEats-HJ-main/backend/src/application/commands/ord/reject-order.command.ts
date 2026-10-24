import type { Order, OrderRejectionRequest, OrdersService } from '#domain/ord/index.js';
import type { Actor } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';

export class RejectOrderCommand implements Command<Order> {
  readonly name = 'RejectOrderCommand';

  constructor(
    private readonly ordersService: OrdersService,
    private readonly actor: Actor,
    private readonly id: string,
    private readonly request: OrderRejectionRequest,
  ) {}

  execute(): Promise<Order> {
    return this.ordersService.reject(this.actor, this.id, this.request);
  }
}
