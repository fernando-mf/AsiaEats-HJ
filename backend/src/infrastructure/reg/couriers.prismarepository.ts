import { Injectable } from '@nestjs/common';
import { DuplicateEntityError, InternalError, NotFoundError } from '#domain/errors.js';
import { Courier, type CourierFilter, CourierRepository, CourierStatus, Position } from '#domain/reg/index.js';
import { Prisma } from '#infrastructure/generated/prisma/client.js';
import { PrismaService } from '#infrastructure/prisma.service.js';
import { type AccountRow, toAccountModel } from './accounts.prismarepository.js';

@Injectable()
export class PrismaCourierRepository extends CourierRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }

  async create(courier: Courier): Promise<Courier> {
    try {
      const row = await this.db.client().courier.create({
        data: {
          accountId: courier.account.id,
          latitude: courier.position?.latitude ?? null,
          longitude: courier.position?.longitude ?? null,
          status: courier.status,
          createdAt: courier.createdAt,
          updatedAt: courier.updatedAt,
        },
        include: { account: true },
      });

      return toCourier(row);
    } catch (err) {
      if (this.db.isUniqueViolation(err)) {
        throw new DuplicateEntityError('courier');
      }
      if (this.db.isForeignKeyViolation(err)) {
        throw new NotFoundError('account');
      }
      throw new InternalError(err as Error);
    }
  }

  async getByAccountId(accountId: string): Promise<Courier> {
    const row = await this.db.client().courier.findUnique({ where: { accountId }, include: { account: true } });
    if (!row) {
      throw new NotFoundError('courier');
    }

    return toCourier(row);
  }

  async list(filter?: CourierFilter): Promise<Courier[]> {
    try {
      const rows = await this.db.client().courier.findMany({
        where: { status: filter?.status },
        include: { account: true },
        orderBy: { createdAt: 'asc' },
      });
      return rows.map(toCourier);
    } catch (err) {
      throw new InternalError(err as Error);
    }
  }

  async findClosestIdle(origin: Position, excludeIds: string[] = []): Promise<Courier | null> {
    try {
      const rows = await this.db.client().$queryRaw<{ account_id: string }[]>(Prisma.sql`
        SELECT account_id
        FROM couriers
        WHERE status = 'idle' AND latitude IS NOT NULL AND longitude IS NOT NULL
          AND account_id <> ALL(${excludeIds}::uuid[])
          AND NOT EXISTS (
            SELECT 1 FROM delivery_assignments d
            WHERE d.courier_id = couriers.account_id AND d.status = 'offered'
          )
        ORDER BY earth_distance(
                   ll_to_earth(latitude, longitude),
                   ll_to_earth(${origin.latitude}::float8, ${origin.longitude}::float8)
                 ) ASC,
                 account_id ASC
        LIMIT 1`);
      if (rows.length === 0) {
        return null;
      }
      return await this.getByAccountId(rows[0].account_id);
    } catch (err) {
      if (err instanceof NotFoundError) {
        return null;
      }
      throw new InternalError(err as Error);
    }
  }

  async update(courier: Courier): Promise<Courier> {
    try {
      const row = await this.db.client().courier.update({
        where: { accountId: courier.account.id },
        data: {
          latitude: courier.position?.latitude ?? null,
          longitude: courier.position?.longitude ?? null,
          status: courier.status,
          updatedAt: courier.updatedAt,
        },
        include: { account: true },
      });
      return toCourier(row);
    } catch (err) {
      if (this.db.isRecordNotFound(err)) {
        throw new NotFoundError('courier');
      }
      throw new InternalError(err as Error);
    }
  }
}

function toCourier(row: {
  latitude: number | null;
  longitude: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  account: AccountRow;
}): Courier {
  let position: Position | null = null;
  if (row.latitude !== null && row.longitude !== null) {
    position = new Position();
    position.latitude = row.latitude;
    position.longitude = row.longitude;
  }

  const courier = new Courier();
  courier.account = toAccountModel(row.account);
  courier.position = position;
  courier.status = row.status as CourierStatus;
  courier.createdAt = row.createdAt;
  courier.updatedAt = row.updatedAt;
  return courier;
}
