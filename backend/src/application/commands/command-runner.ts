import { Injectable } from '@nestjs/common';
import type { Command } from './command.js';

@Injectable()
export class CommandRunner {
  execute<TResult>(command: Command<TResult>): Promise<TResult> {
    return command.execute();
  }
}
