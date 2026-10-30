import type { Account } from '../dashboard/dashboard.types';

type CustomerProfileProps = {
  account: Account;
};

export function CustomerProfile({ account }: CustomerProfileProps) {
  const roleLabel = account.role.charAt(0).toUpperCase() + account.role.slice(1);

  return (
    <>
      <section className="profile-banner">
        <div className="profile-avatar">{account.name.trim().charAt(0).toUpperCase()}</div>
        <div>
          <p className="eyebrow">YOUR ACCOUNT</p>
          <h1>{account.name}</h1>
          <p>Your account details.</p>
        </div>
      </section>
      <section className="panel storefront-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">PERSONAL INFORMATION</p>
            <h2>Profile details</h2>
          </div>
        </div>
        <div className="profile-details">
          <div className="profile-detail">
            <span>Full name</span>
            <strong>{account.name}</strong>
          </div>
          <div className="profile-detail">
            <span>Username</span>
            <strong>@{account.username}</strong>
          </div>
          <div className="profile-detail">
            <span>Email address</span>
            <strong>{account.email || 'Not provided for this account'}</strong>
            {!account.email ? (
              <small>
                This version of EatChinese uses usernames to sign in and does not currently store an email address.
              </small>
            ) : null}
          </div>
          <div className="profile-detail">
            <span>Account type</span>
            <strong>{roleLabel}</strong>
          </div>
        </div>
      </section>
    </>
  );
}
