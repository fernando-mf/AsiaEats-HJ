import { Injectable } from '@nestjs/common';
import { InternalError, NotFoundError } from '#domain/errors.js';
import { Order, OrderRepository, OrderStatus } from '#domain/ord/index.js';
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
}

function toOrderModel(row: {
  id: string;
  customerId: string;
  restaurantId: string;
  status: string;
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
