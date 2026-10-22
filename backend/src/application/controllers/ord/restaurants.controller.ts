import { Body, Controller, Delete, Get, HttpCode, Logger, Param, Post, Put, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AccountRole, type Actor } from '#domain/reg/index.js';
import {
  MenuItem,
  MenuItemCreationRequest,
  MenuItemUpdateRequest,
  Order,
  OrdersService,
  Restaurant,
  RestaurantCreationRequest,
  RestaurantSearchRequest,
  RestaurantSearchResult,
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
import { FindRestaurantsCommand } from '#application/commands/ord/find-restaurants.command.js';
import { GetMenuCommand } from '#application/commands/ord/get-menu.command.js';
import { GetPreparationQueueCommand } from '#application/commands/ord/get-preparation-queue.command.js';
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
    private readonly restaurants: RestaurantsService,
    private readonly orders: OrdersService,
    private readonly commandRunner: CommandRunner,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create restaurant' })
  @ApiCreatedResponse({ type: Restaurant })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  create(@CurrentActor() actor: Actor, @Body() body: RestaurantCreationRequest) {
    const request = RestaurantCreationRequest.initialize(body);

    let command: Command<Restaurant> = new CreateRestaurantCommand(this.restaurants, actor, request);
    command = new AuthorizedCommand(command, actor, [AccountRole.Restaurant]);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Get()
  @ApiOperation({ summary: 'Search restaurants' })
  @ApiOkResponse({ type: [RestaurantSearchResult] })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  find(@CurrentActor() actor: Actor, @Query() query: RestaurantSearchRequest) {
    const request = RestaurantSearchRequest.initialize(query);

    let command: Command<RestaurantSearchResult[]> = new FindRestaurantsCommand(this.restaurants, request);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update restaurant' })
  @ApiOkResponse({ type: Restaurant })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  update(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() body: RestaurantUpdateRequest) {
    const request = RestaurantUpdateRequest.initialize(body);

    let command: Command<Restaurant> = new UpdateRestaurantCommand(this.restaurants, actor, id, request);
    command = new AuthorizedCommand(command, actor, [AccountRole.Restaurant, AccountRole.Operator]);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update restaurant status' })
  @ApiOkResponse({ type: Restaurant })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  @ApiConflictResponse({ type: ErrorResponse })
  updateStatus(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() body: RestaurantStatusUpdateRequest) {
    const request = RestaurantStatusUpdateRequest.initialize(body);

    let command: Command<Restaurant> = new UpdateRestaurantStatusCommand(this.restaurants, actor, id, request);
    command = new AuthorizedCommand(command, actor, [AccountRole.Restaurant, AccountRole.Operator]);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Get(':id/menu')
  @ApiOperation({ summary: 'Get restaurant menu' })
  @ApiOkResponse({ type: [MenuItem] })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  getMenu(@CurrentActor() actor: Actor, @Param('id') id: string) {
    let command: Command<MenuItem[]> = new GetMenuCommand(this.restaurants, id);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Get(':id/preparation-queue')
  @ApiOperation({ summary: 'Get preparation queue' })
  @ApiOkResponse({ type: [Order] })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  getPreparationQueue(@CurrentActor() actor: Actor, @Param('id') id: string) {
    let command: Command<Order[]> = new GetPreparationQueueCommand(this.orders, actor, id);
    command = new AuthorizedCommand(command, actor, [AccountRole.Restaurant, AccountRole.Operator]);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Post(':id/menu-items')
  @ApiOperation({ summary: 'Create menu item' })
  @ApiCreatedResponse({ type: MenuItem })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  createMenuItem(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() body: MenuItemCreationRequest) {
    const request = MenuItemCreationRequest.initialize(body);

    let command: Command<MenuItem> = new CreateMenuItemCommand(this.restaurants, actor, id, request);
    command = new AuthorizedCommand(command, actor, [AccountRole.Restaurant]);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Put(':id/menu-items/:itemId')
  @ApiOperation({ summary: 'Update menu item' })
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

    let command: Command<MenuItem> = new UpdateMenuItemCommand(this.restaurants, actor, id, itemId, request);
    command = new AuthorizedCommand(command, actor, [AccountRole.Restaurant]);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }

  @Delete(':id/menu-items/:itemId')
  @ApiOperation({ summary: 'Delete menu item' })
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  deleteMenuItem(@CurrentActor() actor: Actor, @Param('id') id: string, @Param('itemId') itemId: string) {
    let command: Command<void> = new DeleteMenuItemCommand(this.restaurants, actor, id, itemId);
    command = new AuthorizedCommand(command, actor, [AccountRole.Restaurant]);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }
}
