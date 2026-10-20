import { OmitType } from '@nestjs/swagger';
import { Account } from '#domain/reg/index.js';

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

export class LoginResponse {
  accessToken: string;
  account: AccountResponse;
}

export class StatusResponse {
  status: string;
  datetime: string;
}
