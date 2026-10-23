import type { Actor, Customer, CustomersService, CustomerUpdateRequest } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';

export class UpdateCustomerCommand implements Command<Customer> {
  readonly name = 'UpdateCustomerCommand';

  constructor(
    private readonly customersService: CustomersService,
    private readonly actor: Actor,
    private readonly request: CustomerUpdateRequest,
  ) {}

  execute(): Promise<Customer> {
    return this.customersService.update(this.actor, this.request);
  }
}
