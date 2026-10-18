import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { DomainModule } from '#domain/domain.module.js';
import { InfrastructureModule } from '#infrastructure/infrastructure.module.js';
import { StatusController } from './controllers/status.controller.js';
import { AuthController } from './controllers/reg/auth.controller.js';
import { RestaurantsController } from './controllers/ord/restaurants.controller.js';
import { ApplicationErrorFilter } from './filters/application-error.filter.js';
import { validateConfig } from './application.config.js';
import { CommandRunner } from './commands/command-runner.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateConfig, cache: true }),
    InfrastructureModule,
    DomainModule,
  ],
  controllers: [StatusController, AuthController, RestaurantsController],
  providers: [CommandRunner, { provide: APP_FILTER, useClass: ApplicationErrorFilter }],
})
export class AppModule {}
