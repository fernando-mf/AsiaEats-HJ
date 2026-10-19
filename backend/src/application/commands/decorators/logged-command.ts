import { ApplicationError } from '#domain/errors.js';
import type { Command } from '../command.js';
import type { ExecutionActor } from '../execution-actor.js';
import { CommandDecorator } from './command-decorator.js';

export interface CommandLogger {
  log(message: string): void;
  error(message: string): void;
}

export class LoggedCommand<TResult> extends CommandDecorator<TResult> {
  constructor(
    wrapped: Command<TResult>,
    private readonly logger: CommandLogger,
    private readonly actor?: ExecutionActor | null,
  ) {
    super(wrapped);
  }

  async execute(): Promise<TResult> {
    const actorContext = this.actor ? ` actorId=${this.actor.id} actorRole=${this.actor.role}` : '';

    try {
      const result = await this.wrapped.execute();
      this.logger.log(`command=${this.name} status=success${actorContext}`);
      return result;
    } catch (error) {
      const errorCode = getErrorCode(error);
      this.logger.error(`command=${this.name} status=error errorCode=${errorCode}${actorContext}`);
      throw error;
    }
  }
}

function getErrorCode(error: unknown): string {
  if (error instanceof ApplicationError) {
    return error.code;
  }

  if (error instanceof Error && error.constructor.name) {
    return error.constructor.name;
  }

  return 'UnknownError';
}
