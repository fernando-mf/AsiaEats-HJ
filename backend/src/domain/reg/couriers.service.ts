import { Injectable } from '@nestjs/common';
import { EventsService } from '#domain/events/index.js';
import { type Account, AccountRole } from './accounts.models.js';
import type { AccountCreationHandler } from './accounts.handlers.js';
import { Courier, CourierCreatedEvent, CourierStatus } from './couriers.models.js';

export abstract class CourierRepository {
  abstract create(courier: Courier): Promise<Courier>;
}

@Injectable()
export class CouriersService implements AccountCreationHandler {
  readonly role = AccountRole.Courier;

  constructor(
    private readonly repository: CourierRepository,
    private readonly events: EventsService,
  ) {}

  // handleAccountCreation creates a default Courier entry linked to the given Account.
  async handleAccountCreation(account: Account): Promise<void> {
    const courier = new Courier();
    courier.account = account;
    courier.position = null;
    courier.status = CourierStatus.Offline;
    courier.createdAt = account.createdAt;
    courier.updatedAt = account.createdAt;

    const created = await this.repository.create(courier);

    await this.events.publish(
      new CourierCreatedEvent({
        entityId: created.account.id,
        payload: created.toJSON(),
        actor: { id: account.id, role: account.role },
      }),
    );
  }
}
