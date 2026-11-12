import type { Order } from './dashboard.types';

export function formatMoney(value: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
}

// Straight-line distance for labels, e.g. 1.4 km, 12 km.
export function formatDistance(km: number) {
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

export function orderTotal(order: Order) {
  return order.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
}

// What the order was charged once delivered (the fare, fees included), or its items' total
// before that. A refund doesn't change it.
export function chargedTotal(order: Order) {
  return order.billing?.ledger.totalCharge ?? orderTotal(order);
}

// Up to two initials for an avatar, e.g. "Alice Chen" -> "AC".
export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
