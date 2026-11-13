import { Injectable } from '@nestjs/common';
import { DuplicateEntityError, InternalError, NotFoundError } from '#domain/errors.js';
import { Address, Customer, CustomerProfileRepository } from '#domain/reg/index.js';
import { PrismaService } from '#infrastructure/prisma.service.js';
import { type AccountRow, toAccountModel } from './accounts.prismarepository.js';

@Injectable()
export class PrismaCustomerProfileRepository extends CustomerProfileRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }

  async create(customer: Customer): Promise<Customer> {
    try {
      const row = await this.db.customerProfile.create({
        data: {
          accountId: customer.account.id,
          ...toAddressColumns(customer.address),
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
        },
        include: { account: true },
      });

      return toCustomer(row);
    } catch (err) {
      if (this.db.isUniqueViolation(err)) {
        throw new DuplicateEntityError('customer');
      }
      if (this.db.isForeignKeyViolation(err)) {
        throw new NotFoundError('account');
      }
      throw new InternalError(err as Error);
    }
  }

  async update(customer: Customer): Promise<Customer> {
    try {
      const row = await this.db.customerProfile.update({
        where: { accountId: customer.account.id },
        data: {
          ...toAddressColumns(customer.address),
          updatedAt: customer.updatedAt,
        },
        include: { account: true },
      });

      return toCustomer(row);
    } catch (err) {
      if (this.db.isRecordNotFound(err)) {
        throw new NotFoundError('customer');
      }
      throw new InternalError(err as Error);
    }
  }

  async getByAccountId(accountId: string): Promise<Customer> {
    const row = await this.db.customerProfile.findUnique({ where: { accountId }, include: { account: true } });
    if (!row) {
      throw new NotFoundError('customer');
    }

    return toCustomer(row);
  }
}

function toAddressColumns(address: Address | null) {
  return {
    street: address?.street ?? null,
    city: address?.city ?? null,
    postalCode: address?.postalCode ?? null,
    latitude: address?.latitude ?? null,
    longitude: address?.longitude ?? null,
  };
}

function toCustomer(row: {
  street: string | null;
  city: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
  updatedAt: Date;
  account: AccountRow;
}): Customer {
  let address: Address | null = null;
  if (
    row.street !== null &&
    row.city !== null &&
    row.postalCode !== null &&
    row.latitude !== null &&
    row.longitude !== null
  ) {
    address = new Address();
    address.street = row.street;
    address.city = row.city;
    address.postalCode = row.postalCode;
    address.latitude = row.latitude;
    address.longitude = row.longitude;
  }

  const customer = new Customer();
  customer.account = toAccountModel(row.account);
  customer.address = address;
  customer.createdAt = row.createdAt;
  customer.updatedAt = row.updatedAt;
  return customer;
}
