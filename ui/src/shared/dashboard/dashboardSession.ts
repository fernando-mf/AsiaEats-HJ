const DASHBOARD_SESSION_KEY = 'eatchinese.dashboard.v1';

export type CustomerPage = 'restaurants' | 'menu' | 'cart' | 'orders' | 'profile';
export type RestaurantPage = 'overview' | 'orders' | 'menu' | 'profile';
export type OperatorPage = 'overview' | 'orders' | 'ledger';

export type DashboardSession = {
  customerPage: CustomerPage;
  restaurantPage: RestaurantPage;
  selectedRestaurantId: string;
  // Optional so a session saved before the operator's page was kept still reads.
  operatorPage?: OperatorPage;
};

const customerPages: CustomerPage[] = ['restaurants', 'menu', 'cart', 'orders', 'profile'];
const restaurantPages: RestaurantPage[] = ['overview', 'orders', 'menu', 'profile'];
const operatorPages: OperatorPage[] = ['overview', 'orders', 'ledger'];

function isDashboardSession(value: unknown): value is DashboardSession {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  const candidate = value as Partial<DashboardSession>;
  return (
    typeof candidate.customerPage === 'string' &&
    customerPages.includes(candidate.customerPage as CustomerPage) &&
    typeof candidate.restaurantPage === 'string' &&
    restaurantPages.includes(candidate.restaurantPage as RestaurantPage) &&
    typeof candidate.selectedRestaurantId === 'string' &&
    (candidate.operatorPage === undefined || operatorPages.includes(candidate.operatorPage))
  );
}

export function readDashboardSession(): DashboardSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.sessionStorage.getItem(DASHBOARD_SESSION_KEY);
    if (!stored) return null;

    const parsed: unknown = JSON.parse(stored);
    if (isDashboardSession(parsed)) return parsed;

    window.sessionStorage.removeItem(DASHBOARD_SESSION_KEY);
  } catch {
    // Storage may be unavailable or contain invalid JSON.
  }

  return null;
}

export function writeDashboardSession(session: DashboardSession): void {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(DASHBOARD_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Navigation remains usable in memory when browser storage is unavailable.
  }
}

export function clearDashboardSession(): void {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(DASHBOARD_SESSION_KEY);
  } catch {
    // Nothing else is required when browser storage is unavailable.
  }
}
