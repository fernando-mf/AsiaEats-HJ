import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { ApiError, postJson, setAccessToken } from '../shared/api/client';
import { logError, setConsoleActor } from '../shared/console/outputConsole';

type LoginResponse = { accessToken: string; account: { username: string; role: string } };

// Seeded demo accounts, one per role, for the "click to fill" buttons. They copy
// backend/config/seed.json: update both when a username or the shared password changes there.
const DEMO_PASSWORD = 'password123';
const demoAccounts = [
  { username: 'alice', role: 'customer' },
  { username: 'golden-dragon', role: 'restaurant' },
  { username: 'courier', role: 'courier' },
  { username: 'operator1', role: 'operator' },
];

type LoginFeedback = {
  // A notice explains something that happened (e.g. the session ended) without blaming the user.
  kind: 'error' | 'notice';
  message: string;
};

function getLoginError(error: unknown): string {
  if (error instanceof ApiError && (error.code === 'unauthenticated' || error.code === 'not_found')) {
    return 'Invalid username or password.';
  }

  return 'We could not sign you in right now. Please try again.';
}

// The dashboard sends a notice along when it ends a session the user did not end themselves,
// e.g. "Your session is missing or expired".
function sessionNotice(state: unknown): string | undefined {
  if (typeof state !== 'object' || state === null || !('notice' in state)) return undefined;
  return typeof state.notice === 'string' ? state.notice : undefined;
}

export function LoginPage() {
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<LoginFeedback | null>(() => {
    const notice = sessionNotice(location.state);
    return notice ? { kind: 'notice', message: notice } : null;
  });
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password) {
      const message = 'Enter your username and password.';
      logError('LoginCommand', message);
      setFeedback({ kind: 'error', message });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const result = await postJson<LoginResponse>('/auth/login', { username: normalizedUsername, password });
      setAccessToken(result.accessToken);
      setConsoleActor({ username: result.account.username, role: result.account.role });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setFeedback({ kind: 'error', message: getLoginError(error) });
    } finally {
      setIsSubmitting(false);
    }
  }

  function fillDemoAccount(demoUsername: string) {
    setUsername(demoUsername);
    setPassword(DEMO_PASSWORD);
    setFeedback(null);
  }

  return (
    <AuthLayout>
      <div className="login-surface">
        <header className="form-heading">
          <h2>Welcome back</h2>
          <p>Sign in to continue to EatChinese.</p>
        </header>

        {/* noValidate: our own check runs (and logs to the output console) instead of the browser's. */}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
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

        <section className="demo-accounts" aria-labelledby="demo-accounts-title">
          <p className="demo-accounts-title" id="demo-accounts-title">
            Demo accounts · click to fill · password <span className="mono">{DEMO_PASSWORD}</span>
          </p>
          <div className="demo-account-list">
            {demoAccounts.map(account => (
              <button
                className="demo-account"
                type="button"
                key={account.username}
                onClick={() => fillDemoAccount(account.username)}
              >
                <span className="mono">{account.username}</span>
                <span className="demo-account-role">{account.role}</span>
              </button>
            ))}
          </div>
        </section>

        <p className="form-switch">
          New to EatChinese? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
