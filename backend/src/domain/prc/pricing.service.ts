import { Injectable } from '@nestjs/common';
import { FareCalculator } from './fare.calculator.js';
import type { Fare, FareLine, PricingRules } from './pricing.models.js';

// PricingSource provides the pricing values; the infrastructure layer reads them from the
// configuration file.
export abstract class PricingSource {
  abstract load(): Promise<PricingRules>;
}

// PricingService computes fares from the configured pricing rules (R-PRC-01).
@Injectable()
export class PricingService {
  constructor(private readonly source: PricingSource) {}

  async fareFor(lines: readonly FareLine[]): Promise<Fare> {
    const pricing = await this.source.load();
    return FareCalculator.fromPricing(pricing).compute(lines);
  }
}
