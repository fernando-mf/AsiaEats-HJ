import { Body, Controller, Logger, Post } from '@nestjs/common';
import { AccountCreationRequest, AccountsService } from '#domain/reg/index.js';
import { CommandRunner } from '../../commands/command-runner.js';
import { LoggedCommand } from '../../commands/decorators/logged-command.js';
import { CreateAccountCommand } from '../../commands/reg/create-account.command.js';
import { Public } from '../../auth/public.decorator.js';

@Public()
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly service: AccountsService,
    private readonly commandRunner: CommandRunner,
  ) {}

  @Post('register')
  create(@Body() body: AccountCreationRequest) {
    const request = AccountCreationRequest.initialize(body);
    const command = new CreateAccountCommand(this.service, request);
    const loggedCommand = new LoggedCommand(command, this.logger);
    return this.commandRunner.execute(loggedCommand);
  }
}
