import { useState, type FormEvent } from 'react';
import { logError } from '../../shared/console/outputConsole';
import { IconLock } from '../icons/Icons';
import type { Account } from '../dashboard/dashboard.types';

type PersonalInfoFormProps = {
  account: Account;
  busy: string | null;
  onSaveName: (name: string) => Promise<boolean>;
};

// PersonalInfoForm edits the display name. The username identifies the account at sign-in,
// so it is shown but cannot be changed. Limits mirror the backend's AccountUpdateRequest.
export function PersonalInfoForm({ account, busy, onSaveName }: PersonalInfoFormProps) {
  const [name, setName] = useState(account.name);
  const [error, setError] = useState<string | null>(null);
  const changed = name.trim() !== account.name;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 3 || trimmed.length > 100) {
      const message = 'Your name must be between 3 and 100 characters.';
      setError(message);
      logError('UpdateAccountCommand', message);
      return;
    }
    setError(null);
    await onSaveName(trimmed);
  }

  function discard() {
    setName(account.name);
    setError(null);
  }

  return (
    <form className="account-form" onSubmit={handleSubmit} noValidate>
      <div className="account-form-row">
        <div className="field-group">
          <label htmlFor="account-name">Full name</label>
          <input
            id="account-name"
            autoComplete="name"
            value={name}
            onChange={event => setName(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'account-name-error' : undefined}
          />
          {error ? (
            <p className="field-error" id="account-name-error">
              {error}
            </p>
          ) : null}
        </div>
        <div className="field-group">
          <label htmlFor="account-username">Username</label>
          <input
            id="account-username"
            className="mono"
            value={`@${account.username}`}
            readOnly
            aria-describedby="account-username-hint"
          />
          <p className="account-form-hint" id="account-username-hint">
            You sign in with this, so it can’t be changed.
          </p>
        </div>
      </div>

      <div className="account-form-actions">
        <button className="ghost-button" type="button" onClick={discard} disabled={!changed}>
          Discard
        </button>
        <button className="primary-button" type="submit" disabled={!changed || busy !== null}>
          Save changes
        </button>
      </div>
    </form>
  );
}

type PasswordFormProps = {
  account: Account;
  busy: string | null;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
};

type PasswordField = 'current' | 'next' | 'confirm';

// PasswordSection shows a "Change" row that opens a form asking for the current password
// and the new one twice. The new password follows the registration rule (8+ characters).
export function PasswordSection({ account, busy, onChangePassword }: PasswordFormProps) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Partial<Record<PasswordField, string>>>({});

  function close() {
    setOpen(false);
    setCurrent('');
    setNext('');
    setConfirm('');
    setErrors({});
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: Partial<Record<PasswordField, string>> = {};
    if (!current) found.current = 'Enter your current password.';
    if (next.length < 8) found.next = 'Use at least 8 characters.';
    else if (next === current) found.next = 'Choose a password different from the current one.';
    if (confirm !== next) found.confirm = 'The passwords don’t match.';
    setErrors(found);
    if (Object.keys(found).length > 0) {
      logError('ChangePasswordCommand', Object.values(found).join(' '));
      return;
    }

    if (await onChangePassword(current, next)) close();
  }

  function field(id: PasswordField, label: string, value: string, onChange: (value: string) => void) {
    return (
      <div className="field-group">
        <label htmlFor={`password-${id}`}>{label}</label>
        <input
          id={`password-${id}`}
          type="password"
          autoComplete={id === 'current' ? 'current-password' : 'new-password'}
          value={value}
          onChange={event => onChange(event.target.value)}
          aria-invalid={Boolean(errors[id])}
          aria-describedby={errors[id] ? `password-${id}-error` : undefined}
        />
        {errors[id] ? (
          <p className="field-error" id={`password-${id}-error`}>
            {errors[id]}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="password-section">
      <div className="profile-row">
        <span className="profile-row-icon">
          <IconLock size={17} />
        </span>
        <div className="profile-row-text">
          <strong>Password</strong>
          <span>Use at least 8 characters.</span>
        </div>
        {open ? null : (
          <button className="secondary-button" type="button" onClick={() => setOpen(true)}>
            Change
          </button>
        )}
      </div>

      {open ? (
        <form className="account-form" onSubmit={handleSubmit} noValidate>
          {/* Lets password managers know which account the new password belongs to. */}
          <input type="text" autoComplete="username" value={account.username} readOnly hidden />
          {field('current', 'Current password', current, setCurrent)}
          {field('next', 'New password', next, setNext)}
          {field('confirm', 'Confirm new password', confirm, setConfirm)}
          <div className="account-form-actions">
            <button className="ghost-button" type="button" onClick={close}>
              Cancel
            </button>
            <button className="primary-button" type="submit" disabled={busy !== null}>
              Save password
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
