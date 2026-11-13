import type { AssignmentComplete, DeliveryService } from '#domain/dlv/index.js';
import type { Actor } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';

export class GetCurrentAssignmentCommand implements Command<AssignmentComplete> {
  readonly name = 'GetCurrentAssignmentCommand';
  readonly readOnly = true;

  constructor(
    private readonly delivery: DeliveryService,
    private readonly actor: Actor,
  ) {}

  async execute(): Promise<AssignmentComplete> {
    return this.delivery.getAssignmentByCourierId(this.actor.id);
  }
}
