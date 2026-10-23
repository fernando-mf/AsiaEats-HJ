import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { ApplicationError, InternalError } from '#domain/errors.js';

// ApplicationErrorFilter is a custom exception filter that converts our domain errors to HTTP responses.
@Catch()
export class ApplicationErrorFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(ApplicationErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    //
    // leave Nest's own errors untouched
    //
    if (exception instanceof HttpException) {
      return super.catch(exception, host);
    }

    //
    // any other error is returned as one of our own ApplicationErrors
    //
    const err = this.toApplicationError(exception);

    this.logger.error(err.message, err.statusCode >= 500 ? err.stack : undefined);

    const { httpAdapter } = this.httpAdapterHost!;
    httpAdapter.reply(host.switchToHttp().getResponse(), err.toJSON(), err.statusCode);
  }

  private toApplicationError(exception: unknown): ApplicationError {
    if (exception instanceof ApplicationError) {
      return exception;
    }

    return new InternalError(exception instanceof Error ? exception : String(exception));
  }
}
