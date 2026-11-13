import type { Assignment, DeliveryService } from '#domain/dlv/index.js';
import type { Actor } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';

export class DeliverAssignmentCommand implements Command<Assignment> {
  readonly name = 'DeliverAssignmentCommand';

  constructor(
    private readonly delivery: DeliveryService,
    private readonly actor: Actor,
    private readonly id: string,
  ) {}

  execute(): Promise<Assignment> {
    return this.delivery.deliverAssignment(this.actor, this.id);
  }
}
