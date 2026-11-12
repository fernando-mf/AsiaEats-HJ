import { Controller, Get, Logger } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { LedgerEntry, LedgerService } from '#domain/prc/index.js';
import { AccountRole, type Actor } from '#domain/reg/index.js';
import { CommandRunner } from '#application/commands/command-runner.js';
import { AuthorizedCommand } from '#application/commands/decorators/authorized-command.js';
import { LoggedCommand } from '#application/commands/decorators/logged-command.js';
import { ListLedgerCommand } from '#application/commands/prc/list-ledger.command.js';
import { Command } from '#application/commands/command.js';
import { CurrentActor } from '#application/auth/current-actor.decorator.js';
import { ApiRoles, getApiRoles } from '#application/controllers/api-roles.decorator.js';
import { ErrorResponse } from '#application/controllers/responses.dto.js';

@ApiTags('ledger')
@ApiBearerAuth()
@Controller('ledger')
export class LedgerController {
  private readonly logger = new Logger(LedgerController.name);

  constructor(
    private readonly ledger: LedgerService,
    private readonly commandRunner: CommandRunner,
  ) {}

  @Get()
  @ApiRoles(AccountRole.Operator)
  @ApiOperation({
    summary: 'List the billing ledger',
    description: 'Every ledger entry, charges and refunds, most recent first.',
  })
  @ApiOkResponse({ type: [LedgerEntry] })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  list(@CurrentActor() actor: Actor) {
    let command: Command<LedgerEntry[]> = new ListLedgerCommand(this.ledger);
    command = new AuthorizedCommand(command, actor, getApiRoles(this.list));
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }
}
