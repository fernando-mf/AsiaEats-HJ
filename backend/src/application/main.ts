import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module.js';
import type { Config } from './application.config.js';
import { configureApp } from './app.setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const config = app.get<ConfigService<Config, true>>(ConfigService);

  await app.listen(config.get('PORT', { infer: true }));
}

// Must not be awaited: Vercel intercepts listen() and waits for this module to finish loading.
void bootstrap();
