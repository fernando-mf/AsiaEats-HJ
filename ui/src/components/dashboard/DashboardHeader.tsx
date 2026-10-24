import type { CustomerPage } from '../../shared/dashboard/dashboardSession';
import type { Account } from './dashboard.types';

type DashboardHeaderProps = {
  account: Account | null;
  cartCount?: number;
  customerPage?: CustomerPage;
  onCustomerPageChange?: (page: CustomerPage) => void;
  onLogout: () => void;
};

export function DashboardHeader({
  account,
  cartCount = 0,
  customerPage,
  onCustomerPageChange,
  onLogout,
}: DashboardHeaderProps) {
  const customerNav = [
    { id: 'restaurants' as const, label: 'Restaurants', icon: '⌂' },
    { id: 'cart' as const, label: `Cart${cartCount ? ` (${cartCount})` : ''}`, icon: '🛒' },
    { id: 'profile' as const, label: 'My profile', icon: '○' },
  ];

  return (
    <header className="dashboard-header site-header">
      <button className="brand-mark" onClick={() => onCustomerPageChange?.('restaurants')} aria-label="AsiaEats home">
        <span className="brand-icon">A</span>
        <span>
          AsiaEats<small>GOOD FOOD, GOOD MOOD</small>
        </span>
      </button>
      <div className="header-actions">
        {account?.role === 'customer' && customerPage && onCustomerPageChange
          ? customerNav.map(item => (
              <button
                key={item.id}
                className={`nav-button ${
                  customerPage === item.id || (item.id === 'restaurants' && customerPage === 'menu') ? 'active' : ''
                }`}
                onClick={() => onCustomerPageChange(item.id)}
              >
                <span>{item.icon}</span> {item.label}
              </button>
            ))
          : null}
        {account ? <span className="welcome-user">Hi, {account.name}</span> : null}
        <button className="secondary-button" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </header>
  );
}
