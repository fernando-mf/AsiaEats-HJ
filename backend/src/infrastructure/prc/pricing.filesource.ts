import { readFile } from 'node:fs/promises';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { InternalError } from '#domain/errors.js';
import { type PricingRules, PricingSource } from '#domain/prc/index.js';
import { SEED_FILE } from '#infrastructure/env/seed.filesource.js';

// A dollar amount that is not negative and is a whole number of cents, e.g. 2.50 but not 2.505.
const money = z
  .number()
  .nonnegative()
  .refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 1e-9, 'must be a whole number of cents');

// The "pricing" section of the configuration file.
const pricingFileSchema = z.object({
  pricing: z.object({
    deliveryFee: money,
    serviceFee: money,
    smallOrderThreshold: money,
    smallOrderSurcharge: money,
  }),
});

// parsePricing checks the text of the configuration file and returns its pricing values.
export function parsePricing(text: string, source = SEED_FILE): PricingRules {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (err) {
    throw new InternalError(`${source} is not valid JSON: ${(err as Error).message}`);
  }

  const result = pricingFileSchema.safeParse(json);
  if (!result.success) {
    const problems = result.error.issues.map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`);
    throw new InternalError(`${source} has no valid pricing: ${problems.join('; ')}`);
  }
  return result.data.pricing;
}

// FilePricingSource reads the pricing values from the configuration file (the same file as the
// seed) each time a fare is computed, so the values in the file are always the ones applied.
@Injectable()
export class FilePricingSource extends PricingSource {
  async load(): Promise<PricingRules> {
    let text: string;
    try {
      text = await readFile(SEED_FILE, 'utf8');
    } catch (err) {
      throw new InternalError(`cannot read the configuration file ${SEED_FILE}: ${(err as Error).message}`);
    }
    return parsePricing(text);
  }
}
