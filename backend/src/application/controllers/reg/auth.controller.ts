import { Body, Controller, Get, HttpCode, Logger, Post } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Account, AccountCreationRequest, AccountsService, LoginRequest, type Actor } from '#domain/reg/index.js';
import { GetMeCommand } from '../../commands/reg/get-me.command.js';
import { CurrentActor } from '../../auth/current-actor.decorator.js';
import { LoginCommand, LoginResult } from '../../commands/reg/login.command.js';
import { CommandRunner } from '../../commands/command-runner.js';
import { LoggedCommand } from '../../commands/decorators/logged-command.js';
import { CreateAccountCommand } from '../../commands/reg/create-account.command.js';
import { Public } from '../../auth/public.decorator.js';
import { Command } from '../../commands/command.js';

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
  create(@Body() body: AccountCreationRequest) {
    const request = AccountCreationRequest.initialize(body);

    let command: Command<Account> = new CreateAccountCommand(this.service, request);
    command = new LoggedCommand(command, this.logger);

    return this.commandRunner.execute(command);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() body: LoginRequest) {
    const request = LoginRequest.initialize(body);

    let command: Command<LoginResult> = new LoginCommand(this.service, this.jwt, request);
    command = new LoggedCommand(command, this.logger);

    return this.commandRunner.execute(command);
  }

  @Get('me')
  me(@CurrentActor() actor: Actor) {
    let command: Command<Account> = new GetMeCommand(this.service, actor);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }
}
