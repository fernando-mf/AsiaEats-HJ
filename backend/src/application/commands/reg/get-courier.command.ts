import type { Courier, CouriersService } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';

export class GetCourierCommand implements Command<Courier> {
  readonly name = 'GetCourierCommand';
  readonly readOnly = true;

  constructor(
    private readonly couriersService: CouriersService,
    private readonly id: string,
  ) {}

  execute(): Promise<Courier> {
    return this.couriersService.getById(this.id);
  }
}
