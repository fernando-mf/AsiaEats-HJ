import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { DomainModule } from '#domain/domain.module.js';
import { InfrastructureModule } from '#infrastructure/infrastructure.module.js';
import { StatusController } from '#application/controllers/status.controller.js';
import { AuthController } from '#application/controllers/reg/auth.controller.js';
import { CustomersController } from '#application/controllers/reg/customers.controller.js';
import { EnvController } from '#application/controllers/env/env.controller.js';
import { EventsController } from '#application/controllers/events/events.controller.js';
import { OrdersController } from '#application/controllers/ord/orders.controller.js';
import { RestaurantsController } from '#application/controllers/ord/restaurants.controller.js';
import { ApplicationErrorFilter } from '#application/filters/application-error.filter.js';
import { validateConfig, type Config } from '#application/application.config.js';
import { CommandRunner } from '#application/commands/command-runner.js';
import { JwtAuthGuard } from '#application/auth/jwt-auth.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateConfig, cache: true }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Config, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          algorithm: 'HS256' as const,
          expiresIn: config.get('JWT_EXPIRES_IN_SECONDS', { infer: true }),
        },
      }),
    }),
    InfrastructureModule,
    DomainModule,
  ],
  controllers: [
    StatusController,
    AuthController,
    CustomersController,
    EnvController,
    EventsController,
    OrdersController,
    RestaurantsController,
  ],
  providers: [
    CommandRunner,
    { provide: APP_FILTER, useClass: ApplicationErrorFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
