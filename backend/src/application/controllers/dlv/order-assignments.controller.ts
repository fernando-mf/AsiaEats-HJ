import { Controller, HttpCode, Logger, Param, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Assignment, DispatcherService } from '#domain/dlv/index.js';
import { AccountRole, type Actor } from '#domain/reg/index.js';
import { CommandRunner } from '#application/commands/command-runner.js';
import { AuthorizedCommand } from '#application/commands/decorators/authorized-command.js';
import { LoggedCommand } from '#application/commands/decorators/logged-command.js';
import { AcceptAssignmentCommand } from '#application/commands/dlv/accept-assignment.command.js';
import { Command } from '#application/commands/command.js';
import { CurrentActor } from '#application/auth/current-actor.decorator.js';
import { ApiRoles, getApiRoles } from '#application/controllers/api-roles.decorator.js';
import { ErrorResponse } from '#application/controllers/responses.dto.js';

@ApiTags('order-assignments')
@ApiBearerAuth()
@Controller('order-assignments')
export class OrderAssignmentsController {
  private readonly logger = new Logger(OrderAssignmentsController.name);

  constructor(
    private readonly dispatcher: DispatcherService,
    private readonly commandRunner: CommandRunner,
  ) {}

  @Post(':id/accept')
  @HttpCode(200)
  @ApiRoles(AccountRole.Courier)
  @ApiOperation({ summary: 'Accept the order offered to the courier' })
  @ApiOkResponse({ type: Assignment })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse, description: 'Not offered to this courier' })
  @ApiConflictResponse({
    type: ErrorResponse,
    description: 'Assignment is not offered, order is not ready, or the courier already holds an order',
  })
  accept(@CurrentActor() actor: Actor, @Param('id') id: string) {
    let command: Command<Assignment> = new AcceptAssignmentCommand(this.dispatcher, actor, id);
    command = new AuthorizedCommand(command, actor, getApiRoles(this.accept));
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }
}
