import type { Order, OrdersService } from '#domain/ord/index.js';
import type { Actor } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';

export class GetPreparationQueueCommand implements Command<Order[]> {
  readonly name = 'GetPreparationQueueCommand';

  constructor(
    private readonly ordersService: OrdersService,
    private readonly actor: Actor,
    private readonly restaurantId: string,
  ) {}

  execute(): Promise<Order[]> {
    return this.ordersService.getPreparationQueue(this.actor, this.restaurantId);
  }
}
