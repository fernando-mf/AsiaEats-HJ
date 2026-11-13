import type { Assignment, AssignmentSearchRequest, DeliveryService } from '#domain/dlv/index.js';
import type { Actor } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';

export class FindAssignmentsCommand implements Command<Assignment[]> {
  readonly name = 'FindAssignmentsCommand';
  readonly readOnly = true;

  constructor(
    private readonly delivery: DeliveryService,
    private readonly actor: Actor,
    private readonly request: AssignmentSearchRequest,
  ) {}

  execute(): Promise<Assignment[]> {
    return this.delivery.findAssignments(this.actor, this.request);
  }
}
