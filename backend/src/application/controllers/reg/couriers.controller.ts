import { Controller, Get, Logger } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AccountRole, type Actor, Courier, CouriersService } from '#domain/reg/index.js';
import { CommandRunner } from '#application/commands/command-runner.js';
import { AuthorizedCommand } from '#application/commands/decorators/authorized-command.js';
import { LoggedCommand } from '#application/commands/decorators/logged-command.js';
import { GetCourierCommand } from '#application/commands/reg/get-courier.command.js';
import { Command } from '#application/commands/command.js';
import { CurrentActor } from '#application/auth/current-actor.decorator.js';
import { ApiRoles, getApiRoles } from '#application/controllers/api-roles.decorator.js';
import { CourierResponse, ErrorResponse } from '#application/controllers/responses.dto.js';

@ApiTags('couriers')
@ApiBearerAuth()
@Controller('couriers')
export class CouriersController {
  private readonly logger = new Logger(CouriersController.name);

  constructor(
    private readonly service: CouriersService,
    private readonly commandRunner: CommandRunner,
  ) {}

  @Get('me')
  @ApiRoles(AccountRole.Courier)
  @ApiOperation({ summary: 'Get courier profile' })
  @ApiOkResponse({ type: CourierResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  get(@CurrentActor() actor: Actor) {
    let command: Command<Courier> = new GetCourierCommand(this.service, actor.id);
    command = new AuthorizedCommand(command, actor, getApiRoles(this.get));
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }
}
