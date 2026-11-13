import { describe, expect, it } from 'vitest';
import { FareCalculator } from './fare.calculator.js';
import type { FareRule } from './fare.rules.js';
import { FareComponentKind, type PricingRules } from './pricing.models.js';

// The values in backend/config/seed.json, which the report states.
const pricing: PricingRules = {
  deliveryFee: 3,
  serviceFee: 2,
  smallOrderThreshold: 15,
  smallOrderSurcharge: 2.5,
};

const calculator = FareCalculator.fromPricing(pricing);

describe('FareCalculator', () => {
  it('adds the delivery fee, the service fee and the surcharge to a small order', () => {
    // Mapo Tofu: 12.75 + 3.00 + 2.00 + 2.50 = 20.25
    const fare = calculator.compute([{ unitPrice: 12.75, quantity: 1 }]);

    expect(fare.components).toEqual([
      { kind: FareComponentKind.Subtotal, amount: 12.75 },
      { kind: FareComponentKind.DeliveryFee, amount: 3 },
      { kind: FareComponentKind.ServiceFee, amount: 2 },
      { kind: FareComponentKind.SmallOrderSurcharge, amount: 2.5 },
    ]);
    expect(fare.total).toBe(20.25);
  });

  it('charges no surcharge once the subtotal reaches the threshold', () => {
    // Pork Dumplings x2: 19.00 + 3.00 + 2.00 = 24.00
    const fare = calculator.compute([{ unitPrice: 9.5, quantity: 2 }]);

    expect(fare.amountOf(FareComponentKind.SmallOrderSurcharge)).toBe(0);
    expect(fare.components.map(component => component.kind)).not.toContain(FareComponentKind.SmallOrderSurcharge);
    expect(fare.total).toBe(24);
  });

  it('charges no surcharge on a subtotal exactly at the threshold, and one a cent below it', () => {
    expect(calculator.compute([{ unitPrice: 15, quantity: 1 }]).total).toBe(20);
    expect(calculator.compute([{ unitPrice: 14.99, quantity: 1 }]).total).toBe(22.49);
  });

  it('sums several lines and quantities', () => {
    // 9.50 x 2 + 6.25 + 15.95 = 41.20, then 41.20 + 3.00 + 2.00 = 46.20
    const fare = calculator.compute([
      { unitPrice: 9.5, quantity: 2 },
      { unitPrice: 6.25, quantity: 1 },
      { unitPrice: 15.95, quantity: 1 },
    ]);

    expect(fare.amountOf(FareComponentKind.Subtotal)).toBe(41.2);
    expect(fare.total).toBe(46.2);
  });

  it("adds up in cents, so prices that floating point can't represent exactly come out exact", () => {
    // In floating point, 0.1 + 0.2 is 0.30000000000000004.
    const fare = calculator.compute([
      { unitPrice: 0.1, quantity: 1 },
      { unitPrice: 0.2, quantity: 1 },
    ]);

    expect(fare.amountOf(FareComponentKind.Subtotal)).toBe(0.3);
    expect(fare.total).toBe(7.8);
  });

  it('gives the same fare every time for the same order (R-PRC-01)', () => {
    const lines = [
      { unitPrice: 13.5, quantity: 1 },
      { unitPrice: 7, quantity: 3 },
    ];

    expect(calculator.compute(lines)).toEqual(calculator.compute(lines));
    expect(FareCalculator.fromPricing(pricing).compute(lines).total).toBe(calculator.compute(lines).total);
  });

  it('applies whatever rules it is given, in order', () => {
    const flat: FareRule = { apply: () => ({ kind: FareComponentKind.ServiceFee, amount: 1 }) };
    const skipped: FareRule = { apply: () => null };

    const fare = new FareCalculator([flat, skipped, flat]).compute([{ unitPrice: 100, quantity: 1 }]);

    expect(fare.components).toHaveLength(2);
    expect(fare.total).toBe(2);
  });
});
