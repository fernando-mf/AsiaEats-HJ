import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DomainModule } from '#domain/domain.module.js';
import { InfrastructureModule } from '#infrastructure/infrastructure.module.js';
import { StatusController } from './controllers/status.controller.js';
import { AuthController } from './controllers/reg/auth.controller.js';
import { ApplicationErrorFilter } from './filters/application-error.filter.js';

@Module({
  imports: [InfrastructureModule, DomainModule],
  controllers: [StatusController, AuthController],
  providers: [{ provide: APP_FILTER, useClass: ApplicationErrorFilter }],
})
export class AppModule {}
