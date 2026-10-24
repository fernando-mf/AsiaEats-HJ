import type { Order } from './dashboard.types';

export function formatMoney(value: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
}

export function orderTotal(order: Order) {
  return order.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
}
