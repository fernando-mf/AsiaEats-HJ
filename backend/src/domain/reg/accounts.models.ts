import { plainToInstance } from 'class-transformer';
import { IsIn, IsString, MinLength } from 'class-validator';

export class AccountCreationRequest {
  @IsIn(['customer', 'restaurant', 'courier', 'operator'])
  role: string;

  @IsString()
  username: string;

  @IsString()
  @MinLength(8)
  password: string;

  static initialize(raw: AccountCreationRequest): AccountCreationRequest {
    return plainToInstance(AccountCreationRequest, raw);
  }
}

export class Account {
  id: string;
}
