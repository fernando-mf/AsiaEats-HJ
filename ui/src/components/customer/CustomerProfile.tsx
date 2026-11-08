import type { Account, Address } from '../dashboard/dashboard.types';
import { AddressForm } from './AddressForm';
import './profile.css';

type CustomerProfileProps = {
  account: Account;
  address: Address | null | undefined;
  busy: string | null;
  onSaveAddress: (address: Address) => Promise<boolean>;
};

export function CustomerProfile({ account, address, busy, onSaveAddress }: CustomerProfileProps) {
  const roleLabel = account.role.charAt(0).toUpperCase() + account.role.slice(1);
  // Remount the form when the saved address changes so its fields start from the new values.
  const formKey = address ? `${address.street}|${address.latitude}|${address.longitude}` : 'none';

  return (
    <div className="profile-page">
      <div className="profile-page-head">
        <p className="eyebrow">Your account</p>
        <h1>Profile</h1>
      </div>

      <div className="profile-grid">
        <section className="card profile-card" aria-labelledby="profile-account-title">
          <h2 id="profile-account-title">Account</h2>
          <dl className="profile-facts">
            <div>
              <dt>Full name</dt>
              <dd>{account.name}</dd>
            </div>
            <div>
              <dt>Username</dt>
              <dd className="mono">@{account.username}</dd>
            </div>
            <div>
              <dt>Account type</dt>
              <dd>{roleLabel}</dd>
            </div>
          </dl>
        </section>

        <section className="card profile-card" aria-labelledby="profile-address-title">
          <div>
            <h2 id="profile-address-title">Delivery address</h2>
            <p className="muted">
              {address
                ? 'Orders are delivered here, and restaurant distances are measured from it.'
                : 'Add an address to start ordering. Restaurant distances are measured from it.'}
            </p>
          </div>
          {address !== undefined ? (
            <AddressForm key={formKey} address={address} busy={busy} onSave={onSaveAddress} />
          ) : (
            <p className="muted">Loading your address…</p>
          )}
        </section>
      </div>
    </div>
  );
}
