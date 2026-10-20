import { Body, Controller, Delete, HttpCode, Logger, Param, Post, Put } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AccountRole, type Actor } from '#domain/reg/index.js';
import {
  MenuItem,
  MenuItemCreationRequest,
  MenuItemUpdateRequest,
  Restaurant,
  RestaurantCreationRequest,
  RestaurantsService,
  RestaurantStatusUpdateRequest,
  RestaurantUpdateRequest,
} from '#domain/ord/index.js';
import { CommandRunner } from '#application/commands/command-runner.js';
import { AuthorizedCommand } from '#application/commands/decorators/authorized-command.js';
import { LoggedCommand } from '#application/commands/decorators/logged-command.js';
import { CreateMenuItemCommand } from '#application/commands/ord/create-menu-item.command.js';
import { CreateRestaurantCommand } from '#application/commands/ord/create-restaurant.command.js';
import { DeleteMenuItemCommand } from '#application/commands/ord/delete-menu-item.command.js';
import { UpdateMenuItemCommand } from '#application/commands/ord/update-menu-item.command.js';
import { UpdateRestaurantStatusCommand } from '#application/commands/ord/update-restaurant-status.command.js';
import { UpdateRestaurantCommand } from '#application/commands/ord/update-restaurant.command.js';
import { Command } from '#application/commands/command.js';
import { CurrentActor } from '#application/auth/current-actor.decorator.js';
import { ErrorResponse } from '#application/controllers/responses.dto.js';

@ApiTags('restaurants')
@ApiBearerAuth()
@Controller('restaurants')
export class RestaurantsController {
  private readonly logger = new Logger(RestaurantsController.name);

  constructor(
    private readonly service: RestaurantsService,
    private readonly commandRunner: CommandRunner,
  ) {}

  @Post()
  @ApiCreatedResponse({ type: Restaurant })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  create(@CurrentActor() actor: Actor, @Body() body: RestaurantCreationRequest) {
    const request = RestaurantCreationRequest.initialize(body);

    let command: Command<Restaurant> = new CreateRestaurantCommand(this.service, actor, request);
    command = new AuthorizedCommand(command, actor, [AccountRole.Restaurant]);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Put(':id')
  @ApiOkResponse({ type: Restaurant })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  update(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() body: RestaurantUpdateRequest) {
    const request = RestaurantUpdateRequest.initialize(body);

    let command: Command<Restaurant> = new UpdateRestaurantCommand(this.service, actor, id, request);
    command = new AuthorizedCommand(command, actor, [AccountRole.Restaurant, AccountRole.Operator]);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Put(':id/status')
  @ApiOkResponse({ type: Restaurant })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  @ApiConflictResponse({ type: ErrorResponse })
  updateStatus(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() body: RestaurantStatusUpdateRequest) {
    const request = RestaurantStatusUpdateRequest.initialize(body);

    let command: Command<Restaurant> = new UpdateRestaurantStatusCommand(this.service, actor, id, request);
    command = new AuthorizedCommand(command, actor, [AccountRole.Restaurant, AccountRole.Operator]);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Post(':id/menu-items')
  @ApiCreatedResponse({ type: MenuItem })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  createMenuItem(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() body: MenuItemCreationRequest) {
    const request = MenuItemCreationRequest.initialize(body);

    let command: Command<MenuItem> = new CreateMenuItemCommand(this.service, actor, id, request);
    command = new AuthorizedCommand(command, actor, [AccountRole.Restaurant]);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Put(':id/menu-items/:itemId')
  @ApiOkResponse({ type: MenuItem })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  updateMenuItem(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: MenuItemUpdateRequest,
  ) {
    const request = MenuItemUpdateRequest.initialize(body);

    let command: Command<MenuItem> = new UpdateMenuItemCommand(this.service, actor, id, itemId, request);
    command = new AuthorizedCommand(command, actor, [AccountRole.Restaurant]);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Delete(':id/menu-items/:itemId')
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  deleteMenuItem(@CurrentActor() actor: Actor, @Param('id') id: string, @Param('itemId') itemId: string) {
    let command: Command<void> = new DeleteMenuItemCommand(this.service, actor, id, itemId);
    command = new AuthorizedCommand(command, actor, [AccountRole.Restaurant]);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }
}
