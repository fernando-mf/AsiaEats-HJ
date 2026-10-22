import { ForbiddenError } from '#domain/errors.js';
import type { EnvService } from '#domain/env/index.js';
import type { Command } from '#application/commands/command.js';

export class ResetEnvCommand implements Command<void> {
  readonly name = 'ResetEnvCommand';

  constructor(
    private readonly envService: EnvService,
    private readonly enabled: boolean,
  ) {}

  execute(): Promise<void> {
    if (!this.enabled) {
      throw new ForbiddenError('environment reset is disabled, set ENV_MANAGER_ENABLED=true');
    }

    return this.envService.reset();
  }
}
