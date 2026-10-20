import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';

export function LoginPage() {
  const [notice, setNotice] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('Login will be connected when the authentication endpoint is available.');
  }

  return (
    <AuthLayout>
      <div className="login-surface">
        <header className="form-heading">
          <h2>Welcome back</h2>
          <p>Sign in to continue to EatChinese.</p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="login-username">Username</label>
            <input
              id="login-username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="field-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              required
            />
          </div>

          <button className="primary-button" type="submit">
            Sign in
          </button>

          {notice ? (
            <p className="form-notice" role="status">
              {notice}
            </p>
          ) : null}
        </form>

        <p className="form-switch">
          New to EatChinese? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
