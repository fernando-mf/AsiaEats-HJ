import { Body, Controller, Logger, Post } from '@nestjs/common';
import { AccountRole, type Actor } from '#domain/reg/index.js';
import { Restaurant, RestaurantCreationRequest, RestaurantsService } from '#domain/ord/index.js';
import { CommandRunner } from '../../commands/command-runner.js';
import { AuthorizedCommand } from '../../commands/decorators/authorized-command.js';
import { LoggedCommand } from '../../commands/decorators/logged-command.js';
import { CreateRestaurantCommand } from '../../commands/ord/create-restaurant.command.js';
import { Command } from '../../commands/command.js';
import { CurrentActor } from '../../auth/current-actor.decorator.js';

@Controller('restaurants')
export class RestaurantsController {
  private readonly logger = new Logger(RestaurantsController.name);

  constructor(
    private readonly service: RestaurantsService,
    private readonly commandRunner: CommandRunner,
  ) {}

  @Post()
  create(@CurrentActor() actor: Actor, @Body() body: RestaurantCreationRequest) {
    const request = RestaurantCreationRequest.initialize(body);

    let command: Command<Restaurant> = new CreateRestaurantCommand(this.service, actor, request);
    command = new AuthorizedCommand(command, actor, [AccountRole.Restaurant]);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }
}
