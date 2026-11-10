import { Injectable } from '@nestjs/common';
import { ConflictError, InternalError, NotFoundError } from '#domain/errors.js';
import { Order, OrderFilter, OrderRepository, OrderStatus } from '#domain/ord/index.js';
import type { Address } from '#domain/reg/index.js';
import { PrismaService } from '#infrastructure/prisma.service.js';

// R-ORD-03: accepted orders are prepared in arrival order, first in, first out. An order
// arrives when it is placed (createdAt), not when it is accepted, so accepting orders out of
// turn does not reorder the queue. The id (UUIDv7, time-ordered) breaks ties.
const preparationQueueOrder = [{ createdAt: 'asc' as const }, { id: 'asc' as const }];

// Every order is read with its lines and the name on the customer's account.
const orderInclude = {
  lines: { orderBy: [{ id: 'asc' as const }] },
  customer: { select: { name: true } },
};

@Injectable()
export class PrismaOrderRepository extends OrderRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }

  async create(order: Order): Promise<Order> {
    try {
      const row = await this.db.client().order.create({
        data: {
          customerId: order.customerId,
          restaurantId: order.restaurantId,
          status: order.status,
          deliveryStreet: order.deliveryAddress?.street ?? null,
          deliveryCity: order.deliveryAddress?.city ?? null,
          deliveryPostalCode: order.deliveryAddress?.postalCode ?? null,
          deliveryLatitude: order.deliveryAddress?.latitude ?? null,
          deliveryLongitude: order.deliveryAddress?.longitude ?? null,
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
        include: orderInclude,
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
    const row = await this.db.client().order.findUnique({
      where: {
        id,
        customerId: filter.customerId,
        restaurant: filter.restaurantOwnerId ? { ownerId: filter.restaurantOwnerId } : undefined,
      },
      include: orderInclude,
    });
    if (!row) {
      throw new NotFoundError('order');
    }

    return toOrderModel(row);
  }

  async list(filter: OrderFilter = {}): Promise<Order[]> {
    try {
      const rows = await this.db.client().order.findMany({
        where: {
          customerId: filter.customerId,
          restaurantId: filter.restaurantId,
          restaurant: filter.restaurantOwnerId ? { ownerId: filter.restaurantOwnerId } : undefined,
        },
        include: orderInclude,
        orderBy: [{ createdAt: 'desc' }],
      });

      return rows.map(toOrderModel);
    } catch (err) {
      throw new InternalError(err as Error);
    }
  }

  async listAccepted(restaurantId: string): Promise<Order[]> {
    try {
      const rows = await this.db.client().order.findMany({
        where: { restaurantId, status: OrderStatus.Accepted },
        include: orderInclude,
        orderBy: preparationQueueOrder,
      });

      return rows.map(toOrderModel);
    } catch (err) {
      throw new InternalError(err as Error);
    }
  }

  async getNextAccepted(restaurantId: string): Promise<Order | undefined> {
    try {
      const row = await this.db.client().order.findFirst({
        where: { restaurantId, status: OrderStatus.Accepted },
        include: orderInclude,
        orderBy: preparationQueueOrder,
      });

      return row ? toOrderModel(row) : undefined;
    } catch (err) {
      throw new InternalError(err as Error);
    }
  }

  async updateStatus(order: Order, previousStatus: OrderStatus): Promise<Order> {
    try {
      const row = await this.db.client().order.update({
        where: { id: order.id, status: previousStatus },
        data: {
          status: order.status,
          rejectionReason: order.rejectionReason ?? null,
          updatedAt: order.updatedAt,
        },
        include: orderInclude,
      });

      return toOrderModel(row);
    } catch (err) {
      if (this.db.isRecordNotFound(err)) {
        throw new ConflictError('order status stale');
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
  rejectionReason: string | null;
  deliveryStreet: string | null;
  deliveryCity: string | null;
  deliveryPostalCode: string | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  createdAt: Date;
  updatedAt: Date;
  customer: { name: string };
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
    customerName: row.customer.name,
    restaurantId: row.restaurantId,
    status: row.status as OrderStatus,
    rejectionReason: row.rejectionReason ?? undefined,
    deliveryAddress: toDeliveryAddress(row),
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

// The five columns are written together, so one missing means the order has no address.
function toDeliveryAddress(row: {
  deliveryStreet: string | null;
  deliveryCity: string | null;
  deliveryPostalCode: string | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
}): Address | null {
  if (
    row.deliveryStreet === null ||
    row.deliveryCity === null ||
    row.deliveryPostalCode === null ||
    row.deliveryLatitude === null ||
    row.deliveryLongitude === null
  ) {
    return null;
  }

  return {
    street: row.deliveryStreet,
    city: row.deliveryCity,
    postalCode: row.deliveryPostalCode,
    latitude: row.deliveryLatitude,
    longitude: row.deliveryLongitude,
  };
}
