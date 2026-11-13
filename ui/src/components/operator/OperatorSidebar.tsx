import type { ReactNode } from 'react';
import { BrandMark } from '../brand/BrandMark';
import type { Account } from '../dashboard/dashboard.types';
import { initials } from '../dashboard/dashboard.utils';
import { IconBag, IconGrid, IconMap, IconMenuBook, IconReceipt, IconRestore, IconSignOut } from '../icons/Icons';
// The operator portal shares the restaurant portal's sidebar layout and styles.
import '../restaurant/restaurant-shell.css';
import './operator.css';

import type { OperatorPage } from '../../shared/dashboard/dashboardSession';

export type { OperatorPage };

type OperatorSidebarProps = {
  account: Account;
  page: OperatorPage;
  // Orders still waiting for a restaurant to accept or reject them.
  waitingCount: number;
  stalledDeliveryCount?: number;
  busy: string | null;
  onPageChange: (page: OperatorPage) => void;
  onRestore: () => void;
  onLogout: () => void;
};

const links: Array<{ page: OperatorPage; label: string; icon: ReactNode }> = [
  { page: 'overview', label: 'Overview', icon: <IconGrid size={17} /> },
  { page: 'orders', label: 'Orders', icon: <IconReceipt size={17} /> },
  { page: 'delivery', label: 'Delivery', icon: <IconBag size={17} /> },
  { page: 'map', label: 'City Map', icon: <IconMap size={17} /> },
  { page: 'ledger', label: 'Ledger', icon: <IconMenuBook size={17} /> },
];

// OperatorSidebar is the operator console's navigation: its pages, the demo controls that
// restore the seeded state, and the signed-in operator.
export function OperatorSidebar({
  account,
  page,
  waitingCount,
  stalledDeliveryCount = 0,
  busy,
  onPageChange,
  onRestore,
  onLogout,
}: OperatorSidebarProps) {
  return (
    <aside className="restaurant-sidebar">
      <BrandMark />

      <div className="operator-console-tile">
        <span aria-hidden="true" />
        Operator console
      </div>

      <nav className="sidebar-nav" aria-label="Operator sections">
        {links.map(link => (
          <button
            key={link.page}
            type="button"
            className="sidebar-link"
            aria-current={page === link.page ? 'page' : undefined}
            onClick={() => onPageChange(link.page)}
          >
            {link.icon}
            {link.label}
            {link.page === 'orders' && waitingCount > 0 ? (
              <span className="sidebar-badge mono" aria-label={`${waitingCount} waiting`}>
                {waitingCount}
              </span>
            ) : null}
            {link.page === 'delivery' && (stalledDeliveryCount ?? 0) > 0 ? (
              <span className="sidebar-badge mono is-warning" aria-label={`${stalledDeliveryCount} stalled`}>
                {stalledDeliveryCount}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      <div className="operator-demo-controls">
        <strong>Demo controls</strong>
        <p>Start the demo again from the seeded accounts, restaurants and menus.</p>
        <button className="secondary-button" type="button" disabled={busy !== null} onClick={onRestore}>
          <IconRestore size={16} />
          Restore initial state
        </button>
      </div>

      <div className="sidebar-owner">
        <span className="sidebar-owner-avatar" aria-hidden="true">
          {initials(account.name)}
        </span>
        <span className="sidebar-owner-text">
          <strong>{account.name}</strong>
          <span>Platform operator</span>
        </span>
        <button className="ghost-button icon-button" type="button" aria-label="Sign out" onClick={onLogout}>
          <IconSignOut size={18} />
        </button>
      </div>
    </aside>
  );
}
