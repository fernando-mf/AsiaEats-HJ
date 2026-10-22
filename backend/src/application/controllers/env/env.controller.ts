import { Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { EnvService } from '#domain/env/index.js';
import { AccountRole, type Actor } from '#domain/reg/index.js';
import type { Config } from '#application/application.config.js';
import { CommandRunner } from '#application/commands/command-runner.js';
import { AuthorizedCommand } from '#application/commands/decorators/authorized-command.js';
import { LoggedCommand } from '#application/commands/decorators/logged-command.js';
import { ResetEnvCommand } from '#application/commands/env/reset-env.command.js';
import { Command } from '#application/commands/command.js';
import { CurrentActor } from '#application/auth/current-actor.decorator.js';
import { ErrorResponse } from '#application/controllers/responses.dto.js';

@ApiTags('env')
@ApiBearerAuth()
@Controller('env')
export class EnvController {
  private readonly logger = new Logger(EnvController.name);

  constructor(
    private readonly service: EnvService,
    private readonly commandRunner: CommandRunner,
    private readonly config: ConfigService<Config, true>,
  ) {}

  @Post('reset')
  @HttpCode(204)
  @ApiOperation({ summary: 'Reset the environment and seeds it with default data. Requires ENV_MANAGER_ENABLED.' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  reset(@CurrentActor() actor: Actor) {
    const enabled = this.config.get('ENV_MANAGER_ENABLED', { infer: true });

    let command: Command<void> = new ResetEnvCommand(this.service, enabled);
    command = new AuthorizedCommand(command, actor, [AccountRole.Operator]);
    command = new LoggedCommand(command, this.logger, actor);

    return this.commandRunner.execute(command);
  }
}
