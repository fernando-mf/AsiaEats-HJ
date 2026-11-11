import { DeliveryFeeRule, type FareRule, ServiceFeeRule, SmallOrderSurchargeRule, SubtotalRule } from './fare.rules.js';
import { Fare, type FareComponent, type FareLine, type PricingRules, toCents } from './pricing.models.js';

// FareCalculator is the context of the Strategy pattern: it holds the rules and applies them in
// order to one order's lines. It knows nothing about any particular fee, so adding or changing a
// rule never touches it.
export class FareCalculator {
  constructor(private readonly rules: readonly FareRule[]) {}

  // The rules the project description defines (R-PRC-01): the order lines, a delivery fee, a
  // service fee, and the small-order surcharge, with the values from the configuration file.
  static fromPricing(pricing: PricingRules): FareCalculator {
    return new FareCalculator([
      new SubtotalRule(),
      new DeliveryFeeRule(pricing.deliveryFee),
      new ServiceFeeRule(pricing.serviceFee),
      new SmallOrderSurchargeRule(pricing.smallOrderThreshold, pricing.smallOrderSurcharge),
    ]);
  }

  compute(lines: readonly FareLine[]): Fare {
    const subtotalCents = lines.reduce((sum, line) => sum + toCents(line.unitPrice) * line.quantity, 0);
    const components = this.rules
      .map(rule => rule.apply({ subtotalCents }))
      .filter((component): component is FareComponent => component !== null);

    return new Fare(components);
  }
}
