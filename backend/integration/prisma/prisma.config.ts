import { defineConfig } from 'prisma/config';

try {
  process.loadEnvFile();
} catch {
  // no .env file, let's assume variables are set in the environment
}

export default defineConfig({
  schema: 'schema.prisma',
  migrations: {
    path: 'migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
