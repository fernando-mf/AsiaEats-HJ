import { Body, Controller, Get, Logger, Put } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AccountRole, type Actor, Customer, CustomersService, CustomerUpdateRequest } from '#domain/reg/index.js';
import { CommandRunner } from '#application/commands/command-runner.js';
import { AuthorizedCommand } from '#application/commands/decorators/authorized-command.js';
import { LoggedCommand } from '#application/commands/decorators/logged-command.js';
import { GetCustomerCommand } from '#application/commands/reg/get-customer.command.js';
import { UpdateCustomerCommand } from '#application/commands/reg/update-customer.command.js';
import { Command } from '#application/commands/command.js';
import { CurrentActor } from '#application/auth/current-actor.decorator.js';
import { CustomerResponse, ErrorResponse } from '#application/controllers/responses.dto.js';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  private readonly logger = new Logger(CustomersController.name);

  constructor(
    private readonly service: CustomersService,
    private readonly commandRunner: CommandRunner,
  ) {}

  @Put('me')
  @ApiOkResponse({ type: CustomerResponse })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  update(@CurrentActor() actor: Actor, @Body() body: CustomerUpdateRequest) {
    const request = CustomerUpdateRequest.initialize(body);

    let command: Command<Customer> = new UpdateCustomerCommand(this.service, actor, request);
    command = new AuthorizedCommand(command, actor, [AccountRole.Customer]);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Get('me')
  @ApiOkResponse({ type: CustomerResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  get(@CurrentActor() actor: Actor) {
    let command: Command<Customer> = new GetCustomerCommand(this.service, actor.id);
    command = new AuthorizedCommand(command, actor, [AccountRole.Customer]);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }
}
