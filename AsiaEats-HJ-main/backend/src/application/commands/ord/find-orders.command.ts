import type { Order, OrderSearchRequest, OrdersService } from '#domain/ord/index.js';
import type { Actor } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';

export class FindOrdersCommand implements Command<Order[]> {
  readonly name = 'FindOrdersCommand';

  constructor(
    private readonly ordersService: OrdersService,
    private readonly actor: Actor,
    private readonly request: OrderSearchRequest,
  ) {}

  execute(): Promise<Order[]> {
    return this.ordersService.find(this.actor, this.request);
  }
}
