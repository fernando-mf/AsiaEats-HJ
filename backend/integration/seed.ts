import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { EnvService } from '#domain/env/index.js';

// Resets the database and seeds it with default data.
// This script is run once during the initial env setup, afterwards the env can be
// reset and seeded using the POST /api/env/reset endpoint using an `operator` role.
async function seed() {
  const envFile = resolve(process.argv[2] ?? '.env');
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
    console.log(`Loaded env file ${envFile}`);
  } else {
    throw new Error(`env file not found: ${envFile}`);
  }

  const { AppModule } = await import('#application/app.module.js');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    await app.get(EnvService).reset();
    console.log('Environment reset and seeded');
  } finally {
    await app.close();
  }
}

await seed();
