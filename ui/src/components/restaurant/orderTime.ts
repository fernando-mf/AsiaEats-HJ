import { useEffect, useState } from 'react';
import type { Order } from '../dashboard/dashboard.types';

export function orderNumber(order: Order) {
  return `#${order.id.slice(0, 8)}`;
}

// When the order entered its current status: placed orders count from when they were placed,
// others from their last status change.
function statusSince(order: Order) {
  return new Date(order.status === 'placed' ? order.createdAt : (order.updatedAt ?? order.createdAt));
}

// Time in the current status, e.g. "just now", "12 min", "1 h 5 min".
export function timeInStatus(order: Order, now: number) {
  const minutes = Math.max(0, Math.floor((now - statusSince(order).getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

export function isSameDay(date: string, day: Date) {
  const value = new Date(date);
  return (
    value.getFullYear() === day.getFullYear() &&
    value.getMonth() === day.getMonth() &&
    value.getDate() === day.getDate()
  );
}

// useNow returns the current time and updates it on an interval, so elapsed times stay current.
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}
