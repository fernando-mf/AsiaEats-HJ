import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { stringify } from 'yaml';

import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

// Generates the OpenAPI spec as YAML without starting the HTTP server.
// Usage: pnpm openapi [output-path]  (defaults to ./openapi.yaml)
async function generate() {
  // preview mode only scans the module metadata, so no providers are instantiated
  // (no database connection needed).
  const app = await NestFactory.create(AppModule, { preview: true, abortOnError: false, logger: false });
  configureApp(app);

  const config = new DocumentBuilder()
    .setTitle('AsiaEats API')
    .setDescription('EatChinese NestJS API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const output = resolve(process.argv[2] ?? 'openapi.yaml');
  await writeFile(output, stringify(document, { lineWidth: 0, aliasDuplicateObjects: false }));

  console.log(`OpenAPI spec written to ${output}`);
  await app.close();
}

await generate();
