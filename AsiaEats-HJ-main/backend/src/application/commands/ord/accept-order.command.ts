import type { Order, OrdersService } from '#domain/ord/index.js';
import type { Actor } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';

export class AcceptOrderCommand implements Command<Order> {
  readonly name = 'AcceptOrderCommand';

  constructor(
    private readonly ordersService: OrdersService,
    private readonly actor: Actor,
    private readonly id: string,
  ) {}

  execute(): Promise<Order> {
    return this.ordersService.accept(this.actor, this.id);
  }
}
