import { Injectable } from '@nestjs/common';
import { validate } from 'class-validator';
import { EventsService } from '#domain/events/index.js';
import { InvalidParamsError } from '#domain/errors.js';
import { type Account, AccountRole, type Actor } from './accounts.models.js';
import type { AccountCreationHandler } from './accounts.handlers.js';
import {
  Address,
  Customer,
  CustomerCreatedEvent,
  CustomerUpdatedEvent,
  CustomerUpdateRequest,
} from './customers.models.js';

export abstract class CustomerProfileRepository {
  abstract create(customer: Customer): Promise<Customer>;
  abstract update(customer: Customer): Promise<Customer>;
  abstract getByAccountId(accountId: string): Promise<Customer>;
}

@Injectable()
export class CustomersService implements AccountCreationHandler {
  readonly role = AccountRole.Customer;

  constructor(
    private readonly repository: CustomerProfileRepository,
    private readonly events: EventsService,
  ) {}

  // create reserves a `Customer` slot in the system so updates can be made to it later.
  async handleAccountCreation(account: Account): Promise<void> {
    const customer = new Customer();
    customer.account = account;
    customer.createdAt = account.createdAt;
    customer.updatedAt = account.createdAt;

    const created = await this.repository.create(customer);

    await this.events.publish(
      new CustomerCreatedEvent({
        entityId: created.account.id,
        payload: created.toJSON(),
        actor: { id: account.id, role: account.role },
      }),
    );
  }

  async update(actor: Actor, request: CustomerUpdateRequest): Promise<Customer> {
    const errors = await validate(request);
    if (errors.length > 0) {
      throw InvalidParamsError.fromClassValidator(errors);
    }

    const customer = await this.repository.getByAccountId(actor.id);

    const address = new Address();
    address.street = request.address.street;
    address.city = request.address.city;
    address.postalCode = request.address.postalCode;
    address.latitude = request.address.latitude;
    address.longitude = request.address.longitude;

    customer.address = address;
    customer.updatedAt = new Date();

    const updated = await this.repository.update(customer);

    await this.events.publish(
      new CustomerUpdatedEvent({
        entityId: updated.account.id,
        payload: updated.toJSON(),
        actor,
      }),
    );

    return updated;
  }

  getById(id: string): Promise<Customer> {
    return this.repository.getByAccountId(id);
  }
}
