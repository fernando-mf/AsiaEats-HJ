import { Controller, Get, HttpCode, Logger, Param, Post, Query } from '@nestjs/common';
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
import { Assignment, AssignmentSearchRequest, DeliveryService } from '#domain/dlv/index.js';
import { AccountRole, type Actor } from '#domain/reg/index.js';
import { CommandRunner } from '#application/commands/command-runner.js';
import { AuthorizedCommand } from '#application/commands/decorators/authorized-command.js';
import { LoggedCommand } from '#application/commands/decorators/logged-command.js';
import { FindAssignmentsCommand } from '#application/commands/dlv/find-assignments.command.js';
import { DeclineAssignmentCommand } from '#application/commands/dlv/decline-assignment.command.js';
import { PickUpAssignmentCommand } from '#application/commands/dlv/pickup-assignment.command.js';
import { DeliverAssignmentCommand } from '#application/commands/dlv/deliver-assignment.command.js';
import { ReassignAssignmentCommand } from '#application/commands/dlv/reassign-assignment.command.js';
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
    private readonly delivery: DeliveryService,
    private readonly commandRunner: CommandRunner,
  ) {}

  @Get()
  @ApiRoles(AccountRole.Operator, AccountRole.Courier)
  @ApiOperation({
    summary: 'List order assignments',
    description: 'A courier only gets their own assignments, the `courierId` query value is ignored.',
  })
  @ApiOkResponse({ type: [Assignment] })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  find(@CurrentActor() actor: Actor, @Query() query: AssignmentSearchRequest) {
    const request = AssignmentSearchRequest.initialize(query);

    let command: Command<Assignment[]> = new FindAssignmentsCommand(this.delivery, actor, request);
    command = new AuthorizedCommand(command, actor, getApiRoles(this.find));
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

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
    let command: Command<Assignment> = new AcceptAssignmentCommand(this.delivery, actor, id);
    command = new AuthorizedCommand(command, actor, getApiRoles(this.accept));
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Post(':id/decline')
  @HttpCode(200)
  @ApiRoles(AccountRole.Courier)
  @ApiOperation({ summary: 'Decline the order offered to the courier' })
  @ApiOkResponse({ type: Assignment })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse, description: 'Not offered to this courier' })
  @ApiConflictResponse({ type: ErrorResponse, description: 'Assignment is not offered' })
  decline(@CurrentActor() actor: Actor, @Param('id') id: string) {
    let command: Command<Assignment> = new DeclineAssignmentCommand(this.delivery, actor, id);
    command = new AuthorizedCommand(command, actor, getApiRoles(this.decline));
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Post(':id/pickup')
  @HttpCode(200)
  @ApiRoles(AccountRole.Courier)
  @ApiOperation({ summary: 'Confirm pickup of the order at the restaurant' })
  @ApiOkResponse({ type: Assignment })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse, description: 'Not assigned to this courier' })
  @ApiConflictResponse({ type: ErrorResponse, description: 'Assignment is not accepted or order is not ready' })
  pickUp(@CurrentActor() actor: Actor, @Param('id') id: string) {
    let command: Command<Assignment> = new PickUpAssignmentCommand(this.delivery, actor, id);
    command = new AuthorizedCommand(command, actor, getApiRoles(this.pickUp));
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Post(':id/deliver')
  @HttpCode(200)
  @ApiRoles(AccountRole.Courier)
  @ApiOperation({ summary: 'Confirm delivery of the order to the customer' })
  @ApiOkResponse({ type: Assignment })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse, description: 'Not assigned to this courier' })
  @ApiConflictResponse({
    type: ErrorResponse,
    description: 'Courier is not carrying the order or order is not picked up',
  })
  deliver(@CurrentActor() actor: Actor, @Param('id') id: string) {
    let command: Command<Assignment> = new DeliverAssignmentCommand(this.delivery, actor, id);
    command = new AuthorizedCommand(command, actor, getApiRoles(this.deliver));
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Post(':id/reassign')
  @HttpCode(200)
  @ApiRoles(AccountRole.Operator)
  @ApiOperation({ summary: 'Reassign a stalled order' })
  @ApiOkResponse({ type: Assignment })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  @ApiConflictResponse({ type: ErrorResponse, description: 'Assignment is not stalled' })
  reassign(@CurrentActor() actor: Actor, @Param('id') id: string) {
    let command: Command<Assignment> = new ReassignAssignmentCommand(this.delivery, actor, id);
    command = new AuthorizedCommand(command, actor, getApiRoles(this.reassign));
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }
}
