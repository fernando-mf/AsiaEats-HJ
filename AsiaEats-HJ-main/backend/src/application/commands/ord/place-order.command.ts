import type { Order, OrderPlacementRequest, OrdersService } from '#domain/ord/index.js';
import type { Actor } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';

export class PlaceOrderCommand implements Command<Order> {
  readonly name = 'PlaceOrderCommand';

  constructor(
    private readonly ordersService: OrdersService,
    private readonly actor: Actor,
    private readonly request: OrderPlacementRequest,
  ) {}

  execute(): Promise<Order> {
    return this.ordersService.place(this.actor, this.request);
  }
}
