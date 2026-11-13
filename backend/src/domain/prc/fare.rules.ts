import { type FareComponent, FareComponentKind, toCents, toDollars } from './pricing.models.js';

// What every rule sees: the order's subtotal in cents, already summed from its lines.
export type FareInput = {
  subtotalCents: number;
};

// Strategy pattern (R-PRC-01). Each part of the fare is one interchangeable rule; the
// FareCalculator applies its rules in a fixed order and adds up what they return. A rule only
// depends on its own configured value and the order's subtotal, so the same order always gets
// the same fare. A rule returns null when it doesn't apply to the order.
export interface FareRule {
  apply(input: FareInput): FareComponent | null;
}

// The order lines themselves: unit price times quantity, summed.
export class SubtotalRule implements FareRule {
  apply(input: FareInput): FareComponent {
    return { kind: FareComponentKind.Subtotal, amount: toDollars(input.subtotalCents) };
  }
}

// A flat delivery fee on every order.
export class DeliveryFeeRule implements FareRule {
  private readonly feeCents: number;

  constructor(fee: number) {
    this.feeCents = toCents(fee);
  }

  apply(): FareComponent {
    return { kind: FareComponentKind.DeliveryFee, amount: toDollars(this.feeCents) };
  }
}

// A flat service fee on every order.
export class ServiceFeeRule implements FareRule {
  private readonly feeCents: number;

  constructor(fee: number) {
    this.feeCents = toCents(fee);
  }

  apply(): FareComponent {
    return { kind: FareComponentKind.ServiceFee, amount: toDollars(this.feeCents) };
  }
}

// A surcharge on orders whose subtotal is strictly below the threshold. An order exactly at the
// threshold pays no surcharge.
export class SmallOrderSurchargeRule implements FareRule {
  private readonly thresholdCents: number;
  private readonly surchargeCents: number;

  constructor(threshold: number, surcharge: number) {
    this.thresholdCents = toCents(threshold);
    this.surchargeCents = toCents(surcharge);
  }

  apply(input: FareInput): FareComponent | null {
    if (input.subtotalCents >= this.thresholdCents) return null;
    return { kind: FareComponentKind.SmallOrderSurcharge, amount: toDollars(this.surchargeCents) };
  }
}
