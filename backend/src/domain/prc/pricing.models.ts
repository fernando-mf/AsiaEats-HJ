// The pricing values, read from the configuration file (backend/config/seed.json, "pricing"),
// never written into the code. Amounts are in dollars.
export type PricingRules = {
  // Added to every order.
  deliveryFee: number;
  // Added to every order.
  serviceFee: number;
  // An order whose subtotal is below this pays the small-order surcharge.
  smallOrderThreshold: number;
  smallOrderSurcharge: number;
};

// What a fare is made of, in the order the parts are added up.
export enum FareComponentKind {
  Subtotal = 'subtotal',
  DeliveryFee = 'delivery_fee',
  ServiceFee = 'service_fee',
  SmallOrderSurcharge = 'small_order_surcharge',
}

export type FareComponent = {
  kind: FareComponentKind;
  // In dollars, exact to the cent.
  amount: number;
};

// The lines a fare is computed from: what the customer ordered, at the price they ordered it.
export type FareLine = {
  unitPrice: number;
  quantity: number;
};

// Fare is the charge for one order and its breakdown, so a person can check the total by hand.
export class Fare {
  constructor(readonly components: readonly FareComponent[]) {}

  // The sum of the parts, added up in cents so no floating-point error creeps in.
  get total(): number {
    return toDollars(this.components.reduce((sum, component) => sum + toCents(component.amount), 0));
  }

  amountOf(kind: FareComponentKind): number {
    return this.components.find(component => component.kind === kind)?.amount ?? 0;
  }

  toJSON() {
    return { components: this.components, total: this.total };
  }
}

// Money is computed in whole cents and only turned back into dollars for display.
export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function toDollars(cents: number): number {
  return cents / 100;
}
