import { Body, Controller, Post } from '@nestjs/common';
import { AccountCreationRequest, AccountsService } from '#domain/reg/index.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AccountsService) {}

  @Post('register')
  create(@Body() body: AccountCreationRequest) {
    const request = AccountCreationRequest.initialize(body);
    return this.service.create(request);
  }
}
