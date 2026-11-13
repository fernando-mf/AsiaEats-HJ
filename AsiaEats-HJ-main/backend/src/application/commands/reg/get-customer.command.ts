import type { Customer, CustomersService } from '#domain/reg/index.js';
import type { Command } from '#application/commands/command.js';

export class GetCustomerCommand implements Command<Customer> {
  readonly name = 'GetCustomerCommand';

  constructor(
    private readonly customersService: CustomersService,
    private readonly id: string,
  ) {}

  execute(): Promise<Customer> {
    return this.customersService.getById(this.id);
  }
}
