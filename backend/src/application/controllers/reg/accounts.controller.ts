import { Body, Controller, Logger, Put } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  Account,
  AccountsService,
  AccountUpdateRequest,
  type Actor,
  PasswordChangeRequest,
} from '#domain/reg/index.js';
import { CommandRunner } from '#application/commands/command-runner.js';
import { LoggedCommand } from '#application/commands/decorators/logged-command.js';
import { ChangePasswordCommand } from '#application/commands/reg/change-password.command.js';
import { UpdateAccountCommand } from '#application/commands/reg/update-account.command.js';
import { Command } from '#application/commands/command.js';
import { CurrentActor } from '#application/auth/current-actor.decorator.js';
import { AccountResponse, ErrorResponse } from '#application/controllers/responses.dto.js';

// Every signed-in role manages its own account here, so no role restriction applies.
@ApiTags('accounts')
@ApiBearerAuth()
@Controller('accounts')
export class AccountsController {
  private readonly logger = new Logger(AccountsController.name);

  constructor(
    private readonly service: AccountsService,
    private readonly commandRunner: CommandRunner,
  ) {}

  @Put('me')
  @ApiOperation({ summary: 'Update current account' })
  @ApiOkResponse({ type: AccountResponse })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  update(@CurrentActor() actor: Actor, @Body() body: AccountUpdateRequest) {
    const request = AccountUpdateRequest.initialize(body);

    let command: Command<Account> = new UpdateAccountCommand(this.service, actor, request);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Put('me/password')
  @ApiOperation({ summary: 'Change current account password' })
  @ApiOkResponse({ type: AccountResponse })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  changePassword(@CurrentActor() actor: Actor, @Body() body: PasswordChangeRequest) {
    const request = PasswordChangeRequest.initialize(body);

    let command: Command<Account> = new ChangePasswordCommand(this.service, actor, request);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }
}
