import { Injectable, type OnModuleInit } from '@nestjs/common';
import { NotFoundError } from '#domain/errors.js';
import { type Event, type EventSubscriber, EventsService } from '#domain/events/index.js';
import { OrderRepository, OrderStatus, OrderStatusChangedEvent } from '#domain/ord/index.js';
import { LedgerEntry, LedgerEntryKind, type OrderSummary, summaryOf } from './ledger.models.js';
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
    if (!FINAL_STATUSES.includes(event.payload.newStatus)) return;

    await this.recordCharge(event.entityId, event.occurredAt);
  }

  // recordCharge records an order's charge once; recording it again returns the first entry.
  async recordCharge(orderId: string, closedAt: Date): Promise<LedgerEntry> {
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

    return this.ledger.record(entry);
  }

  // list returns the whole ledger, refunds included, for the operator to audit (R-PRC-03). Who may
  // call it is checked by the command, like every other permission.
  list(): Promise<LedgerEntry[]> {
    return this.ledger.list();
  }

  // getSummary returns a delivered order's summary, built from its ledger entry: the fare it was
  // charged, even if the pricing values have changed since.
  async getSummary(orderId: string): Promise<OrderSummary> {
    const entry = await this.ledger.findByOrder(orderId, LedgerEntryKind.Charge);
    if (!entry || entry.orderStatus !== OrderStatus.Delivered) {
      throw new NotFoundError('order summary');
    }

    const order = await this.orders.getById(orderId);
    return summaryOf(order, entry);
  }
}
