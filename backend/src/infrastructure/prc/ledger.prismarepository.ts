import { Injectable } from '@nestjs/common';
import { DuplicateEntityError, InternalError } from '#domain/errors.js';
import type { OrderStatus } from '#domain/ord/index.js';
import { LedgerEntry, LedgerEntryKind, LedgerRepository } from '#domain/prc/index.js';
import { PrismaService } from '#infrastructure/prisma.service.js';

@Injectable()
export class PrismaLedgerRepository extends LedgerRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }

  async record(entry: LedgerEntry): Promise<LedgerEntry> {
    try {
      const row = await this.db.client().ledgerEntry.create({
        data: {
          orderId: entry.orderId,
          kind: entry.kind,
          orderStatus: entry.orderStatus,
          customerId: entry.customerId,
          restaurantId: entry.restaurantId,
          subtotal: entry.subtotal,
          deliveryFee: entry.deliveryFee,
          serviceFee: entry.serviceFee,
          smallOrderSurcharge: entry.smallOrderSurcharge,
          total: entry.total,
          orderPlacedAt: entry.orderPlacedAt,
          orderClosedAt: entry.orderClosedAt,
          recordedAt: entry.recordedAt,
        },
      });
      return toLedgerEntry(row);
    } catch (err) {
      if (this.db.isUniqueViolation(err)) {
        throw new DuplicateEntityError('ledger entry');
      }
      throw new InternalError(err as Error);
    }
  }

  async findByOrder(orderId: string, kind: LedgerEntryKind): Promise<LedgerEntry | undefined> {
    const row = await this.db.client().ledgerEntry.findUnique({ where: { orderId_kind: { orderId, kind } } });
    return row ? toLedgerEntry(row) : undefined;
  }
}

type Money = { toNumber(): number };

function toLedgerEntry(row: {
  id: string;
  orderId: string;
  kind: string;
  orderStatus: string;
  customerId: string;
  restaurantId: string;
  subtotal: Money;
  deliveryFee: Money;
  serviceFee: Money;
  smallOrderSurcharge: Money;
  total: Money;
  orderPlacedAt: Date;
  orderClosedAt: Date;
  recordedAt: Date;
}): LedgerEntry {
  const entry = new LedgerEntry();
  entry.id = row.id;
  entry.orderId = row.orderId;
  entry.kind = row.kind as LedgerEntryKind;
  entry.orderStatus = row.orderStatus as OrderStatus;
  entry.customerId = row.customerId;
  entry.restaurantId = row.restaurantId;
  entry.subtotal = row.subtotal.toNumber();
  entry.deliveryFee = row.deliveryFee.toNumber();
  entry.serviceFee = row.serviceFee.toNumber();
  entry.smallOrderSurcharge = row.smallOrderSurcharge.toNumber();
  entry.total = row.total.toNumber();
  entry.orderPlacedAt = row.orderPlacedAt;
  entry.orderClosedAt = row.orderClosedAt;
  entry.recordedAt = row.recordedAt;
  return entry;
}
