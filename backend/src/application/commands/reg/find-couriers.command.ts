import type { CourierSearchRequest, CouriersService, CourierSummary } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';

export class FindCouriersCommand implements Command<CourierSummary[]> {
  readonly name = 'FindCouriersCommand';

  constructor(
    private readonly couriersService: CouriersService,
    private readonly request: CourierSearchRequest,
  ) {}

  execute(): Promise<CourierSummary[]> {
    return this.couriersService.find(this.request);
  }
}
