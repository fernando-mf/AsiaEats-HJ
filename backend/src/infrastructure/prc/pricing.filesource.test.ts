import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FilePricingSource, parsePricing } from './pricing.filesource.js';

// A pricing source reading a configuration file written for the test.
async function sourceFor(contents: string): Promise<FilePricingSource> {
  const file = join(await mkdtemp(join(tmpdir(), 'pricing-')), 'seed.json');
  await writeFile(file, contents);
  return new (class extends FilePricingSource {
    protected readonly file = file;
  })();
}

describe('FilePricingSource', () => {
  it('reads the pricing values from backend/config/seed.json', async () => {
    const source = new FilePricingSource();
    await source.onModuleInit();

    await expect(source.load()).resolves.toEqual({
      deliveryFee: 3,
      serviceFee: 2,
      smallOrderThreshold: 15,
      smallOrderSurcharge: 2.5,
    });
  });

  it('reads the file once, at startup, and uses those values for every fare', async () => {
    const source = await sourceFor(
      JSON.stringify({ pricing: { deliveryFee: 3, serviceFee: 2, smallOrderThreshold: 15, smallOrderSurcharge: 2.5 } }),
    );
    await source.onModuleInit();

    const first = await source.load();
    const second = await source.load();

    expect(second).toBe(first);
  });

  it('stops the app from starting when a pricing value is missing, naming it', async () => {
    const source = await sourceFor(
      JSON.stringify({ pricing: { deliveryFee: 3, serviceFee: 2, smallOrderThreshold: 15 } }),
    );

    await expect(source.onModuleInit()).rejects.toThrow(/has no valid pricing: pricing\.smallOrderSurcharge/);
  });
});

describe('parsePricing', () => {
  const file = (pricing: unknown) => JSON.stringify({ pricing });
  const valid = { deliveryFee: 3, serviceFee: 2, smallOrderThreshold: 15, smallOrderSurcharge: 2.5 };

  it('returns the pricing section of a valid file', () => {
    expect(parsePricing(file(valid), 'seed.json')).toEqual(valid);
  });

  it('refuses a file without a pricing section', () => {
    expect(() => parsePricing(JSON.stringify({}), 'seed.json')).toThrow(/seed.json has no valid pricing: pricing/);
  });

  it('refuses a negative amount and names it', () => {
    expect(() => parsePricing(file({ ...valid, deliveryFee: -1 }), 'seed.json')).toThrow(/pricing\.deliveryFee/);
  });

  it('refuses an amount that is not a whole number of cents', () => {
    expect(() => parsePricing(file({ ...valid, serviceFee: 2.505 }), 'seed.json')).toThrow(
      /pricing\.serviceFee: must be a whole number of cents/,
    );
  });
});
