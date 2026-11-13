import { validate } from 'class-validator';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InvalidParamsError } from '#domain/errors.js';
import { type Event, EventsService } from '#domain/events/index.js';
import {
  OrdersService,
  OrderStatus,
  OrderStatusChangedEvent,
  RestaurantsService,
  type Order,
} from '#domain/ord/index.js';
import {
  type Actor,
  AccountRole,
  CouriersService,
  CourierStatus,
  CourierStatusChangedEvent,
  InvalidCourierTransitionError,
} from '#domain/reg/index.js';
import {
  Assignment,
  type AssignmentSearchRequest,
  AssignmentStatus,
  AssignmentStatusChangedEvent,
  type AssignmentComplete,
} from './assignments.models.js';
import { AssignmentStateMachine } from './assignments.statemachine.js';

export abstract class AssignmentRepository {
  abstract create(assignment: Assignment): Promise<Assignment>;
  abstract update(assignment: Assignment): Promise<Assignment>;
  abstract getByIdAndCourierId(id: string, courierId: string): Promise<Assignment>;
  abstract getActiveByCourierId(courierId: string): Promise<Assignment>; // offered or accepted
  abstract findByOrderId(orderId: string): Promise<Assignment | null>;
  abstract findQueued(): Promise<Assignment[]>; // oldest first
  abstract list(filter: AssignmentSearchRequest): Promise<Assignment[]>; // oldest first
}

@Injectable()
export class DeliveryService implements OnModuleInit {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly repository: AssignmentRepository,
    private readonly orders: OrdersService,
    private readonly restaurants: RestaurantsService,
    private readonly couriers: CouriersService,
    private readonly events: EventsService,
  ) {}

  onModuleInit(): void {
    this.events.subscribe('order.status_changed', event => this.onOrderStatusChanged(event));
    this.events.subscribe('courier.status_changed', event => this.onCourierStatusChanged(event));
  }

  //
  // event handlers
  //

  async onCourierStatusChanged(event: Event): Promise<void> {
    if (!(event instanceof CourierStatusChangedEvent)) {
      return;
    }
    if (event.payload.newStatus !== CourierStatus.Idle) {
      return;
    }

    await this.retryQueued();
  }

  async onOrderStatusChanged(event: Event): Promise<void> {
    if (!(event instanceof OrderStatusChangedEvent)) {
      return;
    }
    if (event.payload.newStatus !== OrderStatus.Ready) {
      return;
    }
    if (!event.actor) {
      return;
    }

    const order = await this.orders.getById(event.actor, event.entityId);
    const assignment = await this.dispatch(order);
    this.logger.log(`order ${order.id} dispatched: ${assignment.status}`);
  }

  //
  // assignment methods
  //

  async acceptAssignment(actor: Actor, id: string): Promise<Assignment> {
    const assignment = await this.repository.getByIdAndCourierId(id, actor.id);
    const event = new AssignmentStateMachine(assignment, actor).accept();

    await this.couriers.assign(actor.id);

    const updated = await this.repository.update(assignment);
    await this.events.publish(event);

    return updated;
  }

  async findAssignments(actor: Actor, request: AssignmentSearchRequest): Promise<Assignment[]> {
    const errors = await validate(request);
    if (errors.length > 0) {
      throw InvalidParamsError.fromClassValidator(errors);
    }

    const courierId = actor.role === AccountRole.Courier ? actor.id : request.courierId;
    return this.repository.list({ status: request.status, courierId });
  }

  async getAssignmentByCourierId(courierId: string): Promise<AssignmentComplete> {
    const assignment = await this.repository.getActiveByCourierId(courierId);
    const order = await this.orders.getForDispatch(assignment.orderId);
    const restaurant = await this.restaurants.getById(order.restaurantId);

    return {
      id: assignment.id,
      status: assignment.status,
      order,
      restaurant,
    };
  }

  //
  // internal helpers
  //

  private async dispatch(order: Order): Promise<Assignment> {
    const existing = await this.repository.findByOrderId(order.id);
    if (existing) {
      return existing;
    }

    const assignment = await this.queue(order);

    return this.tryOffer(assignment, order);
  }

  private async tryOffer(assignment: Assignment, order: Order): Promise<Assignment> {
    const restaurant = await this.restaurants.getById(order.restaurantId);
    const courier = await this.couriers.findClosestAvailable(restaurant.position);
    if (!courier) {
      return assignment;
    }

    const previousStatus = assignment.status;
    assignment.courierId = courier.account.id;
    assignment.status = AssignmentStatus.Offered;
    assignment.updatedAt = new Date();

    const updatedAssignment = await this.repository.update(assignment);
    await this.publishStatusChanged(updatedAssignment, previousStatus);

    return updatedAssignment;
  }

  private async queue(order: Order): Promise<Assignment> {
    const now = new Date();
    const draft = new Assignment();
    draft.orderId = order.id;
    draft.courierId = null;
    draft.status = AssignmentStatus.Queued;
    draft.createdAt = now;
    draft.updatedAt = now;

    const assignment = await this.repository.create(draft);
    await this.publishStatusChanged(assignment, null);

    return assignment;
  }

  private async retryQueued(): Promise<void> {
    const queued = await this.repository.findQueued();
    for (const assignment of queued) {
      try {
        const order = await this.orders.getForDispatch(assignment.orderId);
        const result = await this.tryOffer(assignment, order);
        if (result.status === AssignmentStatus.Queued) {
          return;
        }
        this.logger.log(`order ${order.id} dispatched on retry: ${result.status}`);
      } catch (err) {
        if (err instanceof InvalidCourierTransitionError) {
          return;
        }
        this.logger.error(`retry of assignment ${assignment.id} failed: ${err}`);
      }
    }
  }

  private publishStatusChanged(assignment: Assignment, previousStatus: AssignmentStatus | null): Promise<void> {
    return this.events.publish(
      new AssignmentStatusChangedEvent({
        entityId: assignment.id,
        payload: {
          previousStatus,
          newStatus: assignment.status,
          orderId: assignment.orderId,
          courierId: assignment.courierId,
        },
      }),
    );
  }
}
