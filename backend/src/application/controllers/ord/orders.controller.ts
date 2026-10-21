import { Body, Controller, Get, HttpCode, Logger, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AccountRole, type Actor } from '#domain/reg/index.js';
import {
  Order,
  OrderPlacementRequest,
  OrderRejectionRequest,
  OrderSearchRequest,
  OrdersService,
} from '#domain/ord/index.js';
import { CommandRunner } from '#application/commands/command-runner.js';
import { AuthorizedCommand } from '#application/commands/decorators/authorized-command.js';
import { LoggedCommand } from '#application/commands/decorators/logged-command.js';
import { AcceptOrderCommand } from '#application/commands/ord/accept-order.command.js';
import { FindOrdersCommand } from '#application/commands/ord/find-orders.command.js';
import { GetOrderCommand } from '#application/commands/ord/get-order.command.js';
import { PlaceOrderCommand } from '#application/commands/ord/place-order.command.js';
import { RejectOrderCommand } from '#application/commands/ord/reject-order.command.js';
import { Command } from '#application/commands/command.js';
import { CurrentActor } from '#application/auth/current-actor.decorator.js';
import { ErrorResponse } from '#application/controllers/responses.dto.js';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(
    private readonly service: OrdersService,
    private readonly commandRunner: CommandRunner,
  ) {}

  @Post()
  @ApiCreatedResponse({ type: Order })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  @ApiConflictResponse({ type: ErrorResponse })
  place(@CurrentActor() actor: Actor, @Body() body: OrderPlacementRequest) {
    const request = OrderPlacementRequest.initialize(body);

    let command: Command<Order> = new PlaceOrderCommand(this.service, actor, request);
    command = new AuthorizedCommand(command, actor, [AccountRole.Customer]);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Get()
  @ApiOkResponse({ type: [Order] })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  find(@CurrentActor() actor: Actor, @Query() query: OrderSearchRequest) {
    const request = OrderSearchRequest.initialize(query);

    let command: Command<Order[]> = new FindOrdersCommand(this.service, actor, request);
    command = new AuthorizedCommand(command, actor, [
      AccountRole.Customer,
      AccountRole.Restaurant,
      AccountRole.Operator,
    ]);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Get(':id')
  @ApiOkResponse({ type: Order })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  getById(@CurrentActor() actor: Actor, @Param('id') id: string) {
    let command: Command<Order> = new GetOrderCommand(this.service, actor, id);
    command = new AuthorizedCommand(command, actor, [
      AccountRole.Customer,
      AccountRole.Restaurant,
      AccountRole.Operator,
    ]);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Post(':id/accept')
  @HttpCode(200)
  @ApiOkResponse({ type: Order })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  @ApiConflictResponse({ type: ErrorResponse })
  accept(@CurrentActor() actor: Actor, @Param('id') id: string) {
    let command: Command<Order> = new AcceptOrderCommand(this.service, actor, id);
    command = new AuthorizedCommand(command, actor, [AccountRole.Restaurant]);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @ApiOkResponse({ type: Order })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  @ApiConflictResponse({ type: ErrorResponse })
  reject(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() body: OrderRejectionRequest) {
    const request = OrderRejectionRequest.initialize(body);

    let command: Command<Order> = new RejectOrderCommand(this.service, actor, id, request);
    command = new AuthorizedCommand(command, actor, [AccountRole.Restaurant]);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }
}
