import type { Assignment, DeliveryService } from '#domain/dlv/index.js';
import type { Actor } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';

export class DeclineAssignmentCommand implements Command<Assignment> {
  readonly name = 'DeclineAssignmentCommand';

  constructor(
    private readonly delivery: DeliveryService,
    private readonly actor: Actor,
    private readonly id: string,
  ) {}

  execute(): Promise<Assignment> {
    return this.delivery.declineAssignment(this.actor, this.id);
  }
}
