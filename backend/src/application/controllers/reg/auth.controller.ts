import { Body, Controller, Get, HttpCode, Logger, Post } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Account, AccountCreationRequest, AccountsService, LoginRequest, type Actor } from '#domain/reg/index.js';
import { GetMeCommand } from '#application/commands/reg/get-me.command.js';
import { CurrentActor } from '#application/auth/current-actor.decorator.js';
import { LoginCommand, LoginResult } from '#application/commands/reg/login.command.js';
import { CommandRunner } from '#application/commands/command-runner.js';
import { LoggedCommand } from '#application/commands/decorators/logged-command.js';
import { CreateAccountCommand } from '#application/commands/reg/create-account.command.js';
import { Public } from '#application/auth/public.decorator.js';
import { Command } from '#application/commands/command.js';
import { AccountResponse, ErrorResponse, LoginResponse } from '#application/controllers/responses.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly service: AccountsService,
    private readonly commandRunner: CommandRunner,
    private readonly jwt: JwtService,
  ) {}

  @Public()
  @Post('register')
  @ApiCreatedResponse({ type: AccountResponse })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiConflictResponse({ type: ErrorResponse })
  create(@Body() body: AccountCreationRequest) {
    const request = AccountCreationRequest.initialize(body);

    let command: Command<Account> = new CreateAccountCommand(this.service, request);
    command = new LoggedCommand(command, this.logger);

    return this.commandRunner.execute(command);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ type: LoginResponse })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  login(@Body() body: LoginRequest) {
    const request = LoginRequest.initialize(body);

    let command: Command<LoginResult> = new LoginCommand(this.service, this.jwt, request);
    command = new LoggedCommand(command, this.logger);

    return this.commandRunner.execute(command);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOkResponse({ type: AccountResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  me(@CurrentActor() actor: Actor) {
    let command: Command<Account> = new GetMeCommand(this.service, actor);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }
}
