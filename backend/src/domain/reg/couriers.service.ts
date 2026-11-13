import { Injectable } from '@nestjs/common';
import { validate } from 'class-validator';
import { EventsService } from '#domain/events/index.js';
import { InvalidParamsError } from '#domain/errors.js';
import { type Account, AccountRole, type Actor } from './accounts.models.js';
import type { AccountCreationHandler } from './accounts.handlers.js';
import { InvalidCourierTransitionError } from './couriers.errors.js';
import { CourierStateMachine } from './couriers.statemachine.js';
import {
  Courier,
  CourierCreatedEvent,
  type CourierFilter,
  CourierSearchRequest,
  CourierPositionUpdateRequest,
  CourierStatus,
  type CourierSummary,
  Position,
} from './couriers.models.js';

export abstract class CourierRepository {
  abstract create(courier: Courier): Promise<Courier>;
  abstract getByAccountId(accountId: string): Promise<Courier>;
  abstract list(filter?: CourierFilter): Promise<Courier[]>;
  abstract findClosestIdle(origin: Position, excludeIds?: string[]): Promise<Courier | null>;
  abstract update(courier: Courier): Promise<Courier>;
}

@Injectable()
export class CouriersService implements AccountCreationHandler {
  readonly role = AccountRole.Courier;

  constructor(
    private readonly repository: CourierRepository,
    private readonly events: EventsService,
  ) {}

  getById(id: string): Promise<Courier> {
    return this.repository.getByAccountId(id);
  }

  async find(request: CourierSearchRequest): Promise<CourierSummary[]> {
    const errors = await validate(request);
    if (errors.length > 0) {
      throw InvalidParamsError.fromClassValidator(errors);
    }

    const couriers = await this.repository.list({ status: request.status });
    return couriers.map(c => ({ id: c.account.id, position: c.position, status: c.status }));
  }

  findClosestAvailable(origin: Position, excludeIds: string[] = []): Promise<Courier | null> {
    return this.repository.findClosestIdle(origin, excludeIds);
  }

  async assign(courierId: string): Promise<void> {
    const courier = await this.repository.getByAccountId(courierId);
    if (courier.status !== CourierStatus.Idle) {
      throw new InvalidCourierTransitionError(courier.status, CourierStatus.Assigned);
    }

    await this.updateCourierStatus(courierId, CourierStatus.Assigned);
  }

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

  async updatePosition(actor: Actor, request: CourierPositionUpdateRequest): Promise<Courier> {
    const errors = await validate(request);
    if (errors.length > 0) {
      throw InvalidParamsError.fromClassValidator(errors);
    }

    const position = new Position();
    position.latitude = request.position.latitude;
    position.longitude = request.position.longitude;

    const courier = await this.repository.getByAccountId(actor.id);
    courier.position = position;
    courier.updatedAt = new Date();

    return await this.repository.update(courier);
  }

  async goOnline(courierId: string): Promise<void> {
    await this.updateCourierStatus(courierId, CourierStatus.Idle);
  }

  async goOffline(courierId: string): Promise<void> {
    await this.updateCourierStatus(courierId, CourierStatus.Offline);
  }

  async startCarrying(courierId: string): Promise<void> {
    await this.updateCourierStatus(courierId, CourierStatus.Carrying);
  }

  private async updateCourierStatus(courierId: string, targetState: CourierStatus): Promise<void> {
    const courier = await this.repository.getByAccountId(courierId);
    const event = new CourierStateMachine(courier).transition(targetState);
    if (!event) {
      return;
    }

    await this.repository.update(courier);
    await this.events.publish(event);
  }
}
