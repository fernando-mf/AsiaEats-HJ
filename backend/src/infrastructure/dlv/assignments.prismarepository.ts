import { Injectable } from '@nestjs/common';
import { Assignment, type AssignmentSearchRequest, AssignmentRepository, AssignmentStatus } from '#domain/dlv/index.js';
import { ConflictError, InternalError, NotFoundError } from '#domain/errors.js';
import { PrismaService } from '#infrastructure/prisma.service.js';

@Injectable()
export class PrismaAssignmentRepository extends AssignmentRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }

  async create(assignment: Assignment): Promise<Assignment> {
    try {
      const row = await this.db.client().deliveryAssignment.create({
        data: {
          orderId: assignment.orderId,
          courierId: assignment.courierId,
          status: assignment.status,
          declinedCourierIds: assignment.declinedCourierIds ?? [],
          createdAt: assignment.createdAt,
          updatedAt: assignment.updatedAt,
        },
      });
      return toAssignment(row);
    } catch (err) {
      if (this.db.isUniqueViolation(err)) {
        throw new ConflictError('order already has an assignment');
      }
      if (this.db.isForeignKeyViolation(err)) {
        throw new NotFoundError('order');
      }
      throw new InternalError(err as Error);
    }
  }

  async update(assignment: Assignment): Promise<Assignment> {
    try {
      const row = await this.db.client().deliveryAssignment.update({
        where: { id: assignment.id },
        data: {
          courierId: assignment.courierId,
          status: assignment.status,
          declinedCourierIds: assignment.declinedCourierIds,
          updatedAt: assignment.updatedAt,
        },
      });
      return toAssignment(row);
    } catch (err) {
      if (this.db.isRecordNotFound(err)) {
        throw new NotFoundError('assignment');
      }
      if (this.db.isForeignKeyViolation(err)) {
        throw new NotFoundError('courier');
      }
      throw new InternalError(err as Error);
    }
  }

  async getById(id: string): Promise<Assignment> {
    const row = await this.db.client().deliveryAssignment.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundError('assignment');
    }
    return toAssignment(row);
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.client().deliveryAssignment.delete({ where: { id } });
    } catch (err) {
      if (this.db.isRecordNotFound(err)) {
        throw new NotFoundError('assignment');
      }
      throw new InternalError(err as Error);
    }
  }

  async getByIdAndCourierId(id: string, courierId: string): Promise<Assignment> {
    const row = await this.db.client().deliveryAssignment.findUnique({ where: { id, courierId } });
    if (!row) {
      throw new NotFoundError('assignment');
    }
    return toAssignment(row);
  }

  async getActiveByCourierId(courierId: string): Promise<Assignment> {
    const row = await this.db.client().deliveryAssignment.findFirst({
      where: { courierId, status: { in: [AssignmentStatus.Offered, AssignmentStatus.Accepted] } },
      orderBy: { updatedAt: 'desc' },
    });
    if (!row) {
      throw new NotFoundError('assignment');
    }
    return toAssignment(row);
  }

  async findByOrderId(orderId: string): Promise<Assignment | null> {
    const row = await this.db.client().deliveryAssignment.findUnique({ where: { orderId } });
    return row ? toAssignment(row) : null;
  }

  async findQueued(): Promise<Assignment[]> {
    const rows = await this.db.client().deliveryAssignment.findMany({
      where: { status: AssignmentStatus.Queued },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toAssignment);
  }

  async list(filter: AssignmentSearchRequest): Promise<Assignment[]> {
    const rows = await this.db.client().deliveryAssignment.findMany({
      where: { status: filter.status, courierId: filter.courierId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toAssignment);
  }
}

function toAssignment(row: {
  id: string;
  orderId: string;
  courierId: string | null;
  status: string;
  declinedCourierIds: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}): Assignment {
  const assignment = new Assignment();
  assignment.id = row.id;
  assignment.orderId = row.orderId;
  assignment.courierId = row.courierId;
  assignment.status = row.status as AssignmentStatus;
  assignment.declinedCourierIds = row.declinedCourierIds ?? [];
  assignment.createdAt = row.createdAt;
  assignment.updatedAt = row.updatedAt;
  return assignment;
}
