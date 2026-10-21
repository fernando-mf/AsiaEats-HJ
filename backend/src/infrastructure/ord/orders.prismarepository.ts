import { Injectable } from '@nestjs/common';
import { InternalError, NotFoundError } from '#domain/errors.js';
import { Order, OrderFilter, OrderRepository, OrderStatus } from '#domain/ord/index.js';
import { PrismaService } from '#infrastructure/prisma.service.js';

@Injectable()
export class PrismaOrderRepository extends OrderRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }

  async create(order: Order): Promise<Order> {
    try {
      const row = await this.db.order.create({
        data: {
          customerId: order.customerId,
          restaurantId: order.restaurantId,
          status: order.status,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          lines: {
            create: order.lines.map(line => ({
              menuItemId: line.menuItemId,
              name: line.name,
              unitPrice: line.unitPrice,
              quantity: line.quantity,
            })),
          },
        },
        include: { lines: { orderBy: [{ id: 'asc' }] } },
      });

      return toOrderModel(row);
    } catch (err) {
      if (this.db.isForeignKeyViolation(err)) {
        throw new NotFoundError('restaurant');
      }
      throw new InternalError(err as Error);
    }
  }

  async getById(id: string, filter: OrderFilter = {}): Promise<Order> {
    const row = await this.db.order.findUnique({
      where: {
        id,
        customerId: filter.customerId,
        restaurant: filter.restaurantOwnerId ? { ownerId: filter.restaurantOwnerId } : undefined,
      },
      include: { lines: { orderBy: [{ id: 'asc' }] } },
    });
    if (!row) {
      throw new NotFoundError('order');
    }

    return toOrderModel(row);
  }

  async updateStatus(order: Order): Promise<Order> {
    try {
      const row = await this.db.order.update({
        where: { id: order.id },
        data: {
          status: order.status,
          rejectionReason: order.rejectionReason ?? null,
          updatedAt: order.updatedAt,
        },
        include: { lines: { orderBy: [{ id: 'asc' }] } },
      });

      return toOrderModel(row);
    } catch (err) {
      throw new InternalError(err as Error);
    }
  }
}

function toOrderModel(row: {
  id: string;
  customerId: string;
  restaurantId: string;
  status: string;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  lines: {
    id: string;
    orderId: string;
    menuItemId: string;
    name: string;
    unitPrice: { toNumber(): number };
    quantity: number;
  }[];
}): Order {
  return {
    id: row.id,
    customerId: row.customerId,
    restaurantId: row.restaurantId,
    status: row.status as OrderStatus,
    rejectionReason: row.rejectionReason ?? undefined,
    lines: row.lines.map(line => ({
      id: line.id,
      orderId: line.orderId,
      menuItemId: line.menuItemId,
      name: line.name,
      unitPrice: line.unitPrice.toNumber(),
      quantity: line.quantity,
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
