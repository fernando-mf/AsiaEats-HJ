import { z } from 'zod';
import { infrastructureConfigSchema } from '#infrastructure/infrastructure.config.js';

export const applicationConfigSchema = z.object({
  PORT: z.coerce.number().default(3000),
});

export const configSchema = applicationConfigSchema.extend(infrastructureConfigSchema.shape);

export type Config = z.infer<typeof configSchema>;

export const validateConfig = (raw: Record<string, unknown>): Config => configSchema.parse(raw);
