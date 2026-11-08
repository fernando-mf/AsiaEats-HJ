import { useState } from 'react';
import { findNeighbourhood } from '../../shared/locations/montrealNeighbourhoods';
import { IconHome } from '../icons/Icons';
import type { Account, Address, Order, Restaurant } from '../dashboard/dashboard.types';
import { initials } from '../dashboard/dashboard.utils';
import { PasswordSection, PersonalInfoForm } from './AccountForms';
import { AddressForm } from './AddressForm';
import './profile.css';

type CustomerProfileProps = {
  account: Account;
  address: Address | null | undefined;
  orders: Order[];
  restaurants: Restaurant[];
  busy: string | null;
  onSaveAddress: (address: Address) => Promise<boolean>;
  onSaveName: (name: string) => Promise<boolean>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
};

// Cancelled and rejected orders never reached the customer, so they don't count as "ordered from".
const unfulfilled = ['cancelled', 'rejected'];
const memberSinceFormat = new Intl.DateTimeFormat('en-CA', { month: 'short', year: 'numeric' });

// Short neighbourhood name for the summary line, e.g. "Downtown (Centre-ville)" -> "Downtown".
function neighbourhoodLabel(address: Address) {
  return findNeighbourhood(address.latitude, address.longitude)?.name.split(' (')[0];
}

function orderStats(orders: Order[], restaurants: Restaurant[]) {
  const counts = new Map<string, number>();
  orders
    .filter(order => !unfulfilled.includes(order.status))
    .forEach(order => counts.set(order.restaurantId, (counts.get(order.restaurantId) ?? 0) + 1));
  const [mostOrderedId] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];

  return {
    placed: orders.length,
    restaurantsOrderedFrom: counts.size,
    mostOrdered: mostOrderedId ? restaurants.find(restaurant => restaurant.id === mostOrderedId)?.name : undefined,
  };
}

export function CustomerProfile({
  account,
  address,
  orders,
  restaurants,
  busy,
  onSaveAddress,
  onSaveName,
  onChangePassword,
}: CustomerProfileProps) {
  const [editing, setEditing] = useState(false);
  const roleLabel = account.role.charAt(0).toUpperCase() + account.role.slice(1);
  const memberSince = account.createdAt ? memberSinceFormat.format(new Date(account.createdAt)) : undefined;
  const place = address ? (neighbourhoodLabel(address) ?? address.city) : undefined;
  const summary = [memberSince ? `Member since ${memberSince}` : undefined, place].filter(Boolean).join(' · ');
  const stats = orderStats(orders, restaurants);
  // Remount the form when the saved address changes so its fields start from the new values.
  const formKey = address ? `${address.street}|${address.latitude}|${address.longitude}` : 'none';
  const showForm = address === null || editing;

  async function save(next: Address) {
    const saved = await onSaveAddress(next);
    if (saved) setEditing(false);
    return saved;
  }

  return (
    <div className="profile-page">
      <p className="eyebrow">Account</p>

      <section className="card profile-hero" aria-labelledby="profile-name">
        <span className="profile-avatar" aria-hidden="true">
          {initials(account.name)}
        </span>
        <div className="profile-hero-main">
          <div className="profile-hero-title">
            <h1 id="profile-name">{account.name}</h1>
            <span className="pill pill--primary">{roleLabel}</span>
          </div>
          {summary ? <span className="mono profile-hero-meta">{summary}</span> : null}
        </div>
        <dl className="profile-stats">
          <div>
            <dt>{stats.placed === 1 ? 'order placed' : 'orders placed'}</dt>
            <dd>{stats.placed}</dd>
          </div>
          <div>
            <dt>{stats.restaurantsOrderedFrom === 1 ? 'restaurant tried' : 'restaurants tried'}</dt>
            <dd>{stats.restaurantsOrderedFrom}</dd>
          </div>
          <div>
            <dt>most ordered</dt>
            <dd title={stats.mostOrdered}>{stats.mostOrdered ?? '—'}</dd>
          </div>
        </dl>
      </section>

      <div className="profile-grid">
        <div className="profile-column">
          <section className="card profile-card" aria-labelledby="profile-personal-title">
            <div className="profile-card-head">
              <h2 id="profile-personal-title">Personal information</h2>
              <p>Your name as it appears in the header and on this page.</p>
            </div>
            <PersonalInfoForm key={account.name} account={account} busy={busy} onSaveName={onSaveName} />
          </section>

          <section className="card profile-card" aria-labelledby="profile-address-title">
            <div className="profile-card-head">
              <h2 id="profile-address-title">Delivery address</h2>
              <p>
                {address === null
                  ? 'Add an address to start ordering. Restaurant distances are measured from it.'
                  : 'Orders are delivered here, and restaurant distances are measured from it.'}
              </p>
            </div>

            {address === undefined ? <p className="muted">Loading your address…</p> : null}

            {address && !editing ? (
              <div className="profile-row">
                <span className="profile-row-icon">
                  <IconHome size={17} />
                </span>
                <div className="profile-row-text">
                  <strong>{address.street}</strong>
                  <span>
                    {address.city}, {address.postalCode}
                    {neighbourhoodLabel(address) ? ` · ${neighbourhoodLabel(address)}` : ''}
                  </span>
                </div>
                <button className="ghost-button" type="button" onClick={() => setEditing(true)}>
                  Edit
                </button>
              </div>
            ) : null}

            {showForm ? (
              <AddressForm
                key={formKey}
                address={address}
                busy={busy}
                onSave={save}
                onCancel={address ? () => setEditing(false) : undefined}
              />
            ) : null}
          </section>
        </div>

        <section className="card profile-card" aria-labelledby="profile-security-title">
          <div className="profile-card-head">
            <h2 id="profile-security-title">Account &amp; security</h2>
          </div>
          <PasswordSection account={account} busy={busy} onChangePassword={onChangePassword} />
        </section>
      </div>
    </div>
  );
}
