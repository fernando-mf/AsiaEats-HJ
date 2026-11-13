import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { RoleCard, type PublicRole } from '../components/auth/RoleCard';
import { ApiError, postJson } from '../shared/api/client';

type RegistrationForm = {
  name: string;
  username: string;
  password: string;
  confirmPassword: string;
  role: PublicRole | null;
};

type FormErrors = Partial<Record<keyof RegistrationForm | 'form', string>>;

const initialForm: RegistrationForm = {
  name: '',
  username: '',
  password: '',
  confirmPassword: '',
  role: null,
};

const roles: Array<{ role: PublicRole; title: string; description: string }> = [
  {
    role: 'customer',
    title: 'Customer',
    description: 'Discover and order local Chinese food',
  },
  {
    role: 'restaurant',
    title: 'Restaurant',
    description: 'Manage your restaurant and orders',
  },
  {
    role: 'courier',
    title: 'Courier',
    description: 'Deliver orders around Montréal',
  },
];

function validate(form: RegistrationForm): FormErrors {
  const errors: FormErrors = {};

  if (!form.role) {
    errors.role = 'Choose the account type that best fits you.';
  }

  if (form.name.trim().length < 3) {
    errors.name = 'Name must be at least 3 characters.';
  }

  if (!form.username.trim()) {
    errors.username = 'Enter a username.';
  }

  if (form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Passwords must match.';
  }

  return errors;
}

function getRegistrationError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'duplicate_entity') {
      return 'That username is already in use. Try another one.';
    }

    if (error.code === 'invalid_params') {
      return 'Some account details were not accepted. Review the form and try again.';
    }

    return 'We could not create your account. Please try again.';
  }

  return 'We could not reach EatChinese. Make sure the backend is running and try again.';
}

export function RegisterPage() {
  const [form, setForm] = useState<RegistrationForm>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  function updateField(field: 'name' | 'username' | 'password' | 'confirmPassword', value: string) {
    setForm(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined, form: undefined }));
  }

  function selectRole(role: PublicRole) {
    setForm(current => ({ ...current, role }));
    setErrors(current => ({ ...current, role: undefined, form: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validate(form);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await postJson('/auth/register', {
        name: form.name.trim(),
        username: form.username.trim(),
        password: form.password,
        role: form.role,
      });
      setIsComplete(true);
    } catch (error) {
      setErrors({ form: getRegistrationError(error) });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isComplete) {
    return (
      <AuthLayout>
        <div className="success-state" role="status">
          <span className="success-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="m5 12 4.5 4.5L19 7" />
            </svg>
          </span>
          <h2>Your account is ready</h2>
          <p>Welcome to EatChinese, {form.name.trim()}. You can continue to the sign-in page.</p>
          <Link className="primary-button button-link" to="/login">
            Continue to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <header className="form-heading">
        <h2>Create your account</h2>
        <p>Choose one role and tell us a little about yourself.</p>
      </header>

      <form className="auth-form register-form" onSubmit={handleSubmit} noValidate>
        <fieldset className="role-fieldset" aria-describedby={errors.role ? 'role-error' : undefined}>
          <legend>I want to join as</legend>
          <div className="role-list" role="radiogroup" aria-label="Account role">
            {roles.map(role => (
              <RoleCard key={role.role} {...role} selected={form.role === role.role} onSelect={selectRole} />
            ))}
          </div>
          {errors.role ? (
            <p className="field-error" id="role-error">
              {errors.role}
            </p>
          ) : null}
        </fieldset>

        <div className="field-group">
          <label htmlFor="register-name">Name</label>
          <input
            id="register-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Your full name"
            value={form.name}
            onChange={event => updateField('name', event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name ? (
            <p className="field-error" id="name-error">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className="field-group">
          <label htmlFor="register-username">Username</label>
          <input
            id="register-username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder="Choose a username"
            value={form.username}
            onChange={event => updateField('username', event.target.value)}
            aria-invalid={Boolean(errors.username)}
            aria-describedby={errors.username ? 'username-error' : undefined}
          />
          {errors.username ? (
            <p className="field-error" id="username-error">
              {errors.username}
            </p>
          ) : null}
        </div>

        <div className="form-row">
          <div className="field-group">
            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={event => updateField('password', event.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            {errors.password ? (
              <p className="field-error" id="password-error">
                {errors.password}
              </p>
            ) : null}
          </div>

          <div className="field-group">
            <label htmlFor="register-confirm-password">Confirm password</label>
            <input
              id="register-confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={form.confirmPassword}
              onChange={event => updateField('confirmPassword', event.target.value)}
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
            />
            {errors.confirmPassword ? (
              <p className="field-error" id="confirm-password-error">
                {errors.confirmPassword}
              </p>
            ) : null}
          </div>
        </div>

        {errors.form ? (
          <p className="form-error" role="alert">
            {errors.form}
          </p>
        ) : null}

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="form-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
