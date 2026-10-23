import { z } from 'zod';

export const infrastructureConfigSchema = z.object({
  DATABASE_URL: z.string().min(1),
});

export type InfrastructureConfig = z.infer<typeof infrastructureConfigSchema>;
