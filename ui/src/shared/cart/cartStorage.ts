const CART_STORAGE_KEY = 'eatchinese.cart.v1';

export type StoredCart = {
  restaurantId: string;
  items: Record<string, number>;
};

function isStoredCart(value: unknown): value is StoredCart {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  const candidate = value as Partial<StoredCart>;
  if (typeof candidate.restaurantId !== 'string' || !candidate.restaurantId) return false;
  if (typeof candidate.items !== 'object' || candidate.items === null || Array.isArray(candidate.items)) return false;

  const entries = Object.entries(candidate.items);
  return (
    entries.length > 0 &&
    entries.every(
      ([itemId, quantity]) =>
        itemId.length > 0 && typeof quantity === 'number' && Number.isInteger(quantity) && quantity > 0,
    )
  );
}

export function readStoredCart(): StoredCart | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.sessionStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return null;

    const parsed: unknown = JSON.parse(stored);
    if (isStoredCart(parsed)) return parsed;

    window.sessionStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    // Storage may be unavailable or contain invalid JSON.
  }

  return null;
}

export function writeStoredCart(cart: StoredCart): void {
  if (typeof window === 'undefined') return;

  try {
    if (!cart.restaurantId || Object.keys(cart.items).length === 0) {
      window.sessionStorage.removeItem(CART_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Keep the in-memory cart usable when browser storage is unavailable.
  }
}

export function clearStoredCart(): void {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    // Nothing else is required when browser storage is unavailable.
  }
}
