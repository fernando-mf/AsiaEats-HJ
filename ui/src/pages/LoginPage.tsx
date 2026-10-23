import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { ApiError, postJson } from '../shared/api/client';

type LoginFeedback = {
  kind: 'error' | 'success';
  message: string;
};

function getLoginError(error: unknown): string {
  if (error instanceof ApiError && (error.code === 'unauthenticated' || error.code === 'not_found')) {
    return 'Invalid username or password.';
  }

  return 'We could not sign you in right now. Please try again.';
}

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<LoginFeedback | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password) {
      setFeedback({ kind: 'error', message: 'Enter your username and password.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await postJson('/auth/login', { username: normalizedUsername, password });
      setFeedback({ kind: 'success', message: 'Signed in successfully.' });
    } catch (error) {
      setFeedback({ kind: 'error', message: getLoginError(error) });
    } finally {
      setIsSubmitting(false);
    }
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
              value={username}
              onChange={event => {
                setUsername(event.target.value);
                setFeedback(null);
              }}
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
              value={password}
              onChange={event => {
                setPassword(event.target.value);
                setFeedback(null);
              }}
              required
            />
          </div>

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>

          {feedback ? (
            <p
              className={feedback.kind === 'error' ? 'form-error' : 'form-notice'}
              role={feedback.kind === 'error' ? 'alert' : 'status'}
            >
              {feedback.message}
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
