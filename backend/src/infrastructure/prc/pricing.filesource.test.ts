import { describe, expect, it } from 'vitest';
import { FilePricingSource, parsePricing } from './pricing.filesource.js';

describe('FilePricingSource', () => {
  it('reads the pricing values from backend/config/seed.json', async () => {
    await expect(new FilePricingSource().load()).resolves.toEqual({
      deliveryFee: 3,
      serviceFee: 2,
      smallOrderThreshold: 15,
      smallOrderSurcharge: 2.5,
    });
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
