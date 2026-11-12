import { Body, Controller, Get, HttpCode, Logger, Post, Put, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AccountRole,
  type Actor,
  Courier,
  CourierPositionUpdateRequest,
  CourierSearchRequest,
  CouriersService,
  CourierSummary,
} from '#domain/reg/index.js';
import { CommandRunner } from '#application/commands/command-runner.js';
import { AuthorizedCommand } from '#application/commands/decorators/authorized-command.js';
import { LoggedCommand } from '#application/commands/decorators/logged-command.js';
import { CourierGoOfflineCommand, CourierGoOnlineCommand } from '#application/commands/reg/courier-duty.commands.js';
import { FindCouriersCommand } from '#application/commands/reg/find-couriers.command.js';
import { GetCourierCommand } from '#application/commands/reg/get-courier.command.js';
import { UpdateCourierPositionCommand } from '#application/commands/reg/update-courier-position.command.js';
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

  @Get()
  @ApiRoles(AccountRole.Operator)
  @ApiOperation({ summary: 'List couriers' })
  @ApiOkResponse({ type: [CourierSummary] })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  find(@CurrentActor() actor: Actor, @Query() query: CourierSearchRequest) {
    const request = CourierSearchRequest.initialize(query);

    let command: Command<CourierSummary[]> = new FindCouriersCommand(this.service, request);
    command = new AuthorizedCommand(command, actor, getApiRoles(this.find));
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Put('me/position')
  @ApiRoles(AccountRole.Courier)
  @ApiOperation({ summary: 'Update courier position' })
  @ApiOkResponse({ type: CourierResponse })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  updatePosition(@CurrentActor() actor: Actor, @Body() body: CourierPositionUpdateRequest) {
    const request = CourierPositionUpdateRequest.initialize(body);

    let command: Command<Courier> = new UpdateCourierPositionCommand(this.service, actor, request);
    command = new AuthorizedCommand(command, actor, getApiRoles(this.updatePosition));
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Post('me/online')
  @HttpCode(204)
  @ApiRoles(AccountRole.Courier)
  @ApiOperation({ summary: 'Go on duty' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  goOnline(@CurrentActor() actor: Actor) {
    let command: Command<void> = new CourierGoOnlineCommand(this.service, actor);
    command = new AuthorizedCommand(command, actor, getApiRoles(this.goOnline));
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Post('me/offline')
  @HttpCode(204)
  @ApiRoles(AccountRole.Courier)
  @ApiOperation({ summary: 'Go off duty' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiConflictResponse({ type: ErrorResponse, description: 'The courier is carrying an order' })
  goOffline(@CurrentActor() actor: Actor) {
    let command: Command<void> = new CourierGoOfflineCommand(this.service, actor);
    command = new AuthorizedCommand(command, actor, getApiRoles(this.goOffline));
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }
}
