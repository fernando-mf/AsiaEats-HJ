import type { Order } from './dashboard.types';

export function formatMoney(value: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
}

export function orderTotal(order: Order) {
  return order.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
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
