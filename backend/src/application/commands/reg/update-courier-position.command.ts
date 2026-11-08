import type { Actor, Courier, CourierPositionUpdateRequest, CouriersService } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';

export class UpdateCourierPositionCommand implements Command<Courier> {
  readonly name = 'UpdateCourierPositionCommand';

  constructor(
    private readonly couriersService: CouriersService,
    private readonly actor: Actor,
    private readonly request: CourierPositionUpdateRequest,
  ) {}

  execute(): Promise<Courier> {
    return this.couriersService.updatePosition(this.actor, this.request);
  }
}
