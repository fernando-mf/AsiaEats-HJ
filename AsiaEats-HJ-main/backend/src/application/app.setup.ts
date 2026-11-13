import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const API_PREFIX = 'api';
export const DOCS_PATH = 'docs';

const SWAGGER_UI_CDN = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5';

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix(API_PREFIX);
}

export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('AsiaEats API')
    .setDescription('EatChinese NestJS API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, config);
}

export function setupDocs(app: INestApplication): void {
  SwaggerModule.setup(DOCS_PATH, app, createOpenApiDocument(app), {
    useGlobalPrefix: true,
    customCssUrl: `${SWAGGER_UI_CDN}/swagger-ui.css`,
    customJs: [`${SWAGGER_UI_CDN}/swagger-ui-bundle.js`, `${SWAGGER_UI_CDN}/swagger-ui-standalone-preset.js`],
  });
}
