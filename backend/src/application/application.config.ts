import { z } from 'zod';
import { infrastructureConfigSchema } from '#infrastructure/infrastructure.config.js';

export const applicationConfigSchema = z.object({
  PORT: z.coerce.number().default(3000),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(3600),
});

export const configSchema = applicationConfigSchema.extend(infrastructureConfigSchema.shape);

export type Config = z.infer<typeof configSchema>;

export const validateConfig = (raw: Record<string, unknown>): Config => configSchema.parse(raw);
