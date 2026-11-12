import { OmitType } from '@nestjs/swagger';
import { Order, OrderLine, OrderStatus } from '#domain/ord/index.js';
import { FareComponentKind } from '#domain/prc/index.js';
import { Account, Courier, CourierSummary, Customer } from '#domain/reg/index.js';

export class FieldErrorResponse {
  field: string;
  messages: string[];
}

export class ErrorResponse {
  code: string;
  entityType?: string;
  reason?: string;
  errors?: FieldErrorResponse[];
}

// Account.toJSON() omits the password hash, so the API response does too.
export class AccountResponse extends OmitType(Account, ['passwordHash'] as const) {}

// Customer.toJSON() embeds the account without its password hash.
export class CustomerResponse extends OmitType(Customer, ['account'] as const) {
  account: AccountResponse;
}

export class CourierResponse extends OmitType(Courier, ['account'] as const) {
  account: AccountResponse;
}

export class LoginResponse {
  accessToken: string;
  account: AccountResponse;
}

export class StatusResponse {
  status: string;
  datetime: string;
}

export type CourierSummaryResponse = CourierSummary;

export class FareComponentResponse {
  kind: FareComponentKind;
  // In dollars.
  amount: number;
}

export class FareResponse {
  components: FareComponentResponse[];
  total: number;
}

export class OrderSummaryResponse {
  orderId: string;
  restaurantId: string;
  lines: OrderLine[];
  fare: FareResponse;
  placedAt: Date;
  deliveredAt: Date;
}

export class BillingLedgerResponse {
  finalState: OrderStatus;
  placedAt: Date;
  deliveredAt: Date;
  totalCharge: number;
}

export class BillingDetailsResponse {
  orderId: string;
  summary: OrderSummaryResponse;
  ledger: BillingLedgerResponse;
}

// An order as the orders routes return it: with its billing details once it is delivered (R-PRC-02,
// R-PRC-03), null before that, and always null for couriers.
export class OrderResponse extends Order {
  billing: BillingDetailsResponse | null;
}
