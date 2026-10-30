import { useRef, type ToggleEvent } from 'react';
import type { CustomerPage } from '../../shared/dashboard/dashboardSession';
import { BrandMark } from '../brand/BrandMark';
import { IconBag, IconGrid, IconPin, IconReceipt } from '../icons/Icons';
import type { Account } from './dashboard.types';
import { formatMoney } from './dashboard.utils';

type DashboardHeaderProps = {
  account: Account | null;
  cartCount?: number;
  cartTotal?: number;
  // Customer's delivery street; null when they have not set an address yet.
  deliveryAddress?: string | null;
  customerPage?: CustomerPage;
  onCustomerPageChange?: (page: CustomerPage) => void;
  onLogout: () => void;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const supportsAnchorPositioning = typeof CSS !== 'undefined' && CSS.supports('position-area: block-end');

export function DashboardHeader({
  account,
  cartCount = 0,
  cartTotal = 0,
  deliveryAddress,
  customerPage,
  onCustomerPageChange,
  onLogout,
}: DashboardHeaderProps) {
  const avatarRef = useRef<HTMLButtonElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const showCustomerNav = account?.role === 'customer' && customerPage && onCustomerPageChange;
  const onDiscover = customerPage === 'restaurants' || customerPage === 'menu';

  // Without CSS anchor positioning, place the menu under the avatar, right-aligned to it.
  function positionAccountMenu(event: ToggleEvent<HTMLDivElement>) {
    if (supportsAnchorPositioning || event.newState !== 'open') return;
    const avatar = avatarRef.current?.getBoundingClientRect();
    const menu = accountMenuRef.current;
    if (!avatar || !menu) return;
    menu.style.top = `${avatar.bottom + 8}px`;
    menu.style.right = `${Math.max(8, window.innerWidth - avatar.right)}px`;
  }

  // Close the menu (focus returns to the avatar), then run the chosen action.
  function runFromMenu(action: () => void) {
    accountMenuRef.current?.hidePopover();
    action();
  }

  return (
    <header className="dashboard-header site-header">
      <button className="brand-button" onClick={() => onCustomerPageChange?.('restaurants')} aria-label="EatChinese home">
        <BrandMark />
      </button>

      {showCustomerNav && deliveryAddress !== undefined ? (
        <div className="deliver-to">
          <IconPin size={17} />
          <span>
            <small>Deliver to</small>
            <strong>{deliveryAddress ?? 'No address yet'}</strong>
          </span>
        </div>
      ) : null}

      <span className="header-spacer" />

      <div className="header-actions">
        {showCustomerNav ? (
          <>
            <nav className="header-nav" aria-label="Main">
              <button
                className={`header-nav-link${onDiscover ? ' active' : ''}`}
                aria-current={onDiscover ? 'page' : undefined}
                onClick={() => onCustomerPageChange('restaurants')}
              >
                <IconGrid size={16} />
                Discover
              </button>
              <button
                className={`header-nav-link${customerPage === 'orders' ? ' active' : ''}`}
                aria-current={customerPage === 'orders' ? 'page' : undefined}
                onClick={() => onCustomerPageChange('orders')}
              >
                <IconReceipt size={16} />
                Orders
              </button>
            </nav>
            <button
              className="cart-button"
              aria-label={`Cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}
              onClick={() => onCustomerPageChange('cart')}
            >
              <IconBag size={17} />
              <span className="mono">{formatMoney(cartTotal)}</span>
              {cartCount ? <span className="cart-count">{cartCount}</span> : null}
            </button>
          </>
        ) : null}

        {account ? (
          <>
            <button
              ref={avatarRef}
              className="avatar avatar-button"
              type="button"
              popoverTarget="account-menu"
              aria-label={`Account: ${account.name}`}
            >
              {initials(account.name)}
            </button>
            {/* Right after its trigger, so browsers add no implicit aria-details. */}
            <div
              ref={accountMenuRef}
              id="account-menu"
              className="account-menu"
              popover="auto"
              onToggle={positionAccountMenu}
            >
              <div className="account-menu-head">
                <strong>{account.name}</strong>
                <span>
                  @{account.username} · {account.role}
                </span>
              </div>
              {showCustomerNav ? (
                <button
                  className="account-menu-item"
                  type="button"
                  onClick={() => runFromMenu(() => onCustomerPageChange('profile'))}
                >
                  Profile
                </button>
              ) : null}
              <button className="account-menu-item" type="button" onClick={() => runFromMenu(onLogout)}>
                Sign out
              </button>
            </div>
          </>
        ) : (
          <button className="ghost-button" onClick={onLogout}>
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
