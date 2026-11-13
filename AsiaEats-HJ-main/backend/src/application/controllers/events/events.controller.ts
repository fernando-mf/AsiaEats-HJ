import { Controller, Get, Logger, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { EventsService, StoredEvent } from '#domain/events/index.js';
import { AccountRole, type Actor } from '#domain/reg/index.js';
import { CommandRunner } from '#application/commands/command-runner.js';
import { AuthorizedCommand } from '#application/commands/decorators/authorized-command.js';
import { LoggedCommand } from '#application/commands/decorators/logged-command.js';
import { GetEventsByEntityCommand } from '#application/commands/events/get-events-by-entity.command.js';
import { Command } from '#application/commands/command.js';
import { CurrentActor } from '#application/auth/current-actor.decorator.js';
import { ApiRoles, getApiRoles } from '#application/controllers/api-roles.decorator.js';
import { ErrorResponse } from '#application/controllers/responses.dto.js';

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
export class EventsController {
  private readonly logger = new Logger(EventsController.name);

  constructor(
    private readonly events: EventsService,
    private readonly commandRunner: CommandRunner,
  ) {}

  @Get()
  @ApiRoles(AccountRole.Operator, AccountRole.Restaurant)
  @ApiOperation({ summary: 'Get events by entity' })
  @ApiQuery({ name: 'entityType', required: true })
  @ApiQuery({ name: 'entityId', required: true })
  @ApiOkResponse({ type: [StoredEvent] })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  getByEntity(
    @CurrentActor() actor: Actor,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    let command: Command<StoredEvent[]> = new GetEventsByEntityCommand(this.events, entityType, entityId);
    command = new AuthorizedCommand(command, actor, getApiRoles(this.getByEntity));
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }
}
