import type { Assignment, DeliveryService } from '#domain/dlv/index.js';
import type { Actor } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';

export class AcceptAssignmentCommand implements Command<Assignment> {
  readonly name = 'AcceptAssignmentCommand';

  constructor(
    private readonly delivery: DeliveryService,
    private readonly actor: Actor,
    private readonly id: string,
  ) {}

  execute(): Promise<Assignment> {
    return this.delivery.acceptAssignment(this.actor, this.id);
  }
}
