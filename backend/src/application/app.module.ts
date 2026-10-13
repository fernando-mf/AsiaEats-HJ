import { Module } from '@nestjs/common';
import { DomainModule } from '#domain/domain.module.js';
import { InfrastructureModule } from '#infrastructure/infrastructure.module.js';
import { StatusController } from './controllers/status.controller.js';
import { AuthController } from './controllers/reg/auth.controller.js';

@Module({
  imports: [InfrastructureModule, DomainModule],
  controllers: [StatusController, AuthController],
})
export class AppModule {}
