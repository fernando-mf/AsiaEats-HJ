import { Injectable, type OnModuleInit } from '@nestjs/common';
import { ConflictError } from '#domain/errors.js';
import { type Event, type EventSubscriber, EventsService } from '#domain/events/index.js';
import { OrderRepository, OrderStatus, OrderStatusChangedEvent } from '#domain/ord/index.js';
import type { Actor } from '#domain/reg/index.js';
import { LedgerEntry, LedgerEntryKind, LedgerEntryRecordedEvent, OrderSummaryCreatedEvent } from './ledger.models.js';
import { FareComponentKind } from './pricing.models.js';
import { PricingService } from './pricing.service.js';

export abstract class LedgerRepository {
  abstract record(entry: LedgerEntry): Promise<LedgerEntry>;
  abstract findByOrder(orderId: string, kind: LedgerEntryKind): Promise<LedgerEntry | undefined>;
  // Every entry of these orders, charges and refunds, in one query.
  abstract findByOrders(orderIds: readonly string[]): Promise<LedgerEntry[]>;
  // Every entry, charges and refunds, most recent first.
  abstract list(): Promise<LedgerEntry[]>;
}

// The statuses an order can't leave; reaching one closes the order and records it.
const FINAL_STATUSES: readonly OrderStatus[] = [OrderStatus.Delivered, OrderStatus.Rejected, OrderStatus.Cancelled];

// LedgerService keeps the ledger (R-PRC-03). It subscribes to ORD's events (Observer), so
// ORD doesn't depend on PRC: when an order reaches its final state, its charge is recorded in
// the same transaction as that change. A delivered order is charged its fare (R-PRC-01), and
// that entry is its order summary (R-PRC-02); a rejected or cancelled one is recorded with
// nothing charged.
@Injectable()
export class LedgerService implements EventSubscriber, OnModuleInit {
  constructor(
    private readonly ledger: LedgerRepository,
    private readonly orders: OrderRepository,
    private readonly pricing: PricingService,
    private readonly events: EventsService,
  ) {}

  // Attach to the published events when the app starts.
  onModuleInit(): void {
    this.events.subscribe(this);
  }

  async handle(event: Event): Promise<void> {
    if (!(event instanceof OrderStatusChangedEvent)) return;

    if (event.payload.newStatus === OrderStatus.Refunded) {
      await this.recordRefund(event.entityId, event.occurredAt, event.actor);
    } else if (FINAL_STATUSES.includes(event.payload.newStatus)) {
      await this.recordCharge(event.entityId, event.occurredAt, event.actor);
    }
  }

  // recordRefund records a refunded order's refund as its own entry (R-PRC-05): the charge's amounts,
  // negated, so the ledger adds up to what was actually kept. The charge entry is left unchanged.
  // Recording it again returns the first refund and publishes nothing.
  async recordRefund(orderId: string, refundedAt: Date, actor: Actor | null = null): Promise<LedgerEntry> {
    const existing = await this.ledger.findByOrder(orderId, LedgerEntryKind.Refund);
    if (existing) return existing;

    const charge = await this.ledger.findByOrder(orderId, LedgerEntryKind.Charge);
    if (!charge || charge.orderStatus !== OrderStatus.Delivered) {
      throw new ConflictError('the order has no delivery charge to refund');
    }

    const entry = new LedgerEntry();
    entry.orderId = charge.orderId;
    entry.kind = LedgerEntryKind.Refund;
    entry.orderStatus = OrderStatus.Refunded;
    entry.customerId = charge.customerId;
    entry.restaurantId = charge.restaurantId;
    entry.subtotal = -charge.subtotal;
    entry.deliveryFee = -charge.deliveryFee;
    entry.serviceFee = -charge.serviceFee;
    entry.smallOrderSurcharge = -charge.smallOrderSurcharge;
    entry.total = -charge.total;
    entry.orderPlacedAt = charge.orderPlacedAt;
    entry.orderClosedAt = refundedAt;
    entry.recordedAt = new Date();

    const recorded = await this.ledger.record(entry);
    await this.announce(recorded, actor);
    return recorded;
  }

  // recordCharge records an order's charge once; recording it again returns the first entry and
  // publishes nothing. The events it publishes carry the actor of the change that closed the order.
  async recordCharge(orderId: string, closedAt: Date, actor: Actor | null = null): Promise<LedgerEntry> {
    const existing = await this.ledger.findByOrder(orderId, LedgerEntryKind.Charge);
    if (existing) return existing;

    const order = await this.orders.getById(orderId);
    const fare = order.status === OrderStatus.Delivered ? await this.pricing.fareFor(order.lines) : null;

    const entry = new LedgerEntry();
    entry.orderId = order.id;
    entry.kind = LedgerEntryKind.Charge;
    entry.orderStatus = order.status;
    entry.customerId = order.customerId;
    entry.restaurantId = order.restaurantId;
    entry.subtotal = fare?.amountOf(FareComponentKind.Subtotal) ?? 0;
    entry.deliveryFee = fare?.amountOf(FareComponentKind.DeliveryFee) ?? 0;
    entry.serviceFee = fare?.amountOf(FareComponentKind.ServiceFee) ?? 0;
    entry.smallOrderSurcharge = fare?.amountOf(FareComponentKind.SmallOrderSurcharge) ?? 0;
    entry.total = fare?.total ?? 0;
    entry.orderPlacedAt = order.createdAt;
    entry.orderClosedAt = closedAt;
    entry.recordedAt = new Date();

    const recorded = await this.ledger.record(entry);
    await this.announce(recorded, actor);
    // A delivered order's charge is its summary (R-PRC-02).
    if (fare) {
      await this.events.publish(
        new OrderSummaryCreatedEvent({ entityId: recorded.orderId, payload: { total: recorded.total }, actor }),
      );
    }

    return recorded;
  }

  // announce publishes that an entry was added to the ledger (R-PRC-03).
  private async announce(entry: LedgerEntry, actor: Actor | null): Promise<void> {
    await this.events.publish(
      new LedgerEntryRecordedEvent({
        entityId: entry.id,
        payload: { orderId: entry.orderId, kind: entry.kind, orderStatus: entry.orderStatus, total: entry.total },
        actor,
      }),
    );
  }

  // list returns the whole ledger, refunds included, for the operator to audit (R-PRC-03). Who may
  // call it is checked by the command, like every other permission.
  list(): Promise<LedgerEntry[]> {
    return this.ledger.list();
  }
}
