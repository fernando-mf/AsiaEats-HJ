import { Injectable } from '@nestjs/common';
import { TransactionRunner } from '#domain/transactions.js';
import { PrismaService } from './prisma.service.js';

// PrismaTransactionRunner implements the TransactionRunner port with a Prisma interactive
// transaction. Repositories read PrismaService.client, so their queries join it.
@Injectable()
export class PrismaTransactionRunner extends TransactionRunner {
  constructor(private readonly db: PrismaService) {
    super();
  }

  run<T>(work: () => Promise<T>): Promise<T> {
    return this.db.runInTransaction(work);
  }
}
