import { Injectable } from '@nestjs/common';
import { Assignment, AssignmentRepository, AssignmentStatus } from '#domain/dlv/index.js';
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

  async findByOrderId(orderId: string): Promise<Assignment | null> {
    try {
      const row = await this.db.client().deliveryAssignment.findUnique({ where: { orderId } });
      return row ? toAssignment(row) : null;
    } catch (err) {
      throw new InternalError(err as Error);
    }
  }

  async findQueued(): Promise<Assignment[]> {
    try {
      const rows = await this.db.client().deliveryAssignment.findMany({
        where: { status: AssignmentStatus.Queued },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      return rows.map(toAssignment);
    } catch (err) {
      throw new InternalError(err as Error);
    }
  }
}

function toAssignment(row: {
  id: string;
  orderId: string;
  courierId: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): Assignment {
  const assignment = new Assignment();
  assignment.id = row.id;
  assignment.orderId = row.orderId;
  assignment.courierId = row.courierId;
  assignment.status = row.status as AssignmentStatus;
  assignment.createdAt = row.createdAt;
  assignment.updatedAt = row.updatedAt;
  return assignment;
}
