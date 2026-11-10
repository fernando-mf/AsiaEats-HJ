import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { type EnvSeed, SeedSource } from '#domain/env/index.js';
import { InternalError } from '#domain/errors.js';
import { MenuItemStatus, RestaurantStatus } from '#domain/ord/index.js';

// backend/config/seed.json. This file sits three folders below backend/ both as source
// (src/infrastructure/env) and compiled (dist/infrastructure/env), so the path holds for both.
export const SEED_FILE = fileURLToPath(new URL('../../../config/seed.json', import.meta.url));

// The shape of the file. The services check each value again, as they do for API requests;
// this catches a malformed file early and names the part that is wrong.
const account = z.object({ username: z.string(), name: z.string() });
const position = z.object({ latitude: z.number(), longitude: z.number() });

export const seedFileSchema = z.object({
  password: z.string(),
  operators: z.array(account),
  couriers: z.array(account),
  customers: z.array(
    account.extend({
      address: position.extend({ street: z.string(), city: z.string(), postalCode: z.string() }).optional(),
    }),
  ),
  restaurants: z.array(
    z.object({
      name: z.string(),
      status: z.enum(RestaurantStatus),
      position,
      owner: account,
      menu: z.array(
        z.object({
          name: z.string(),
          price: z.number(),
          status: z.enum(MenuItemStatus).optional(),
        }),
      ),
    }),
  ),
});

// parseSeed checks the text of a seed file and returns the seed it describes.
export function parseSeed(text: string, source = SEED_FILE): EnvSeed {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (err) {
    throw new InternalError(`${source} is not valid JSON: ${(err as Error).message}`);
  }

  const result = seedFileSchema.safeParse(json);
  if (!result.success) {
    const problems = result.error.issues.map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`);
    throw new InternalError(`${source} is not a valid seed: ${problems.join('; ')}`);
  }
  return result.data;
}

// FileSeedSource reads the initial demo state from the configuration file each time the
// environment is reset, so editing the file changes the next reset without a rebuild.
@Injectable()
export class FileSeedSource extends SeedSource {
  async load(): Promise<EnvSeed> {
    let text: string;
    try {
      text = await readFile(SEED_FILE, 'utf8');
    } catch (err) {
      throw new InternalError(`cannot read the seed file ${SEED_FILE}: ${(err as Error).message}`);
    }
    return parseSeed(text);
  }
}
