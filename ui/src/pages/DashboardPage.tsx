import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CourierDashboard } from '../components/dashboard/CourierDashboard';
import { CustomerDashboard } from '../components/dashboard/CustomerDashboard';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { OperatorDashboard } from '../components/dashboard/OperatorDashboard';
import { RestaurantDashboard } from '../components/dashboard/RestaurantDashboard';
import type { Account } from '../components/dashboard/dashboard.types';
import { OutputConsole } from '../components/feedback/OutputConsole';
import { ToastRegion } from '../components/feedback/ToastRegion';
import { useToast } from '../components/feedback/useToast';
import { ApiError, apiErrorMessage, clearAccessToken, getAccessToken, requestJson } from '../shared/api/client';
import { clearStoredCart } from '../shared/cart/cartStorage';
import { clearConsole, setConsoleActor } from '../shared/console/outputConsole';
import { clearDashboardSession } from '../shared/dashboard/dashboardSession';
import './dashboard.css';

export function DashboardPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { toast, showToast, dismissToast, pauseToast, resumeToast } = useToast();

  // endSession forgets everything this browser kept for the signed-in user (token, cart, open
  // page, output console) and returns to login. Signing out and an expired or invalid session
  // both end here, so the next account to sign in on this tab inherits nothing from the previous
  // one. The dashboard and its toasts unmount on the way out, so an explanation (`notice`) is
  // handed to the login page instead.
  const endSession = useCallback(
    (notice?: string) => {
      clearStoredCart();
      clearDashboardSession();
      clearConsole();
      setConsoleActor(undefined);
      clearAccessToken();
      navigate('/login', { replace: true, state: notice ? { notice } : undefined });
    },
    [navigate],
  );

  const run = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
      setBusy('loading');
      try {
        return await action();
      } catch (error) {
        if (error instanceof ApiError && error.code === 'unauthenticated') endSession(apiErrorMessage(error));
        else showToast(apiErrorMessage(error), 'error');
        return undefined;
      } finally {
        setBusy(null);
      }
    },
    [endSession, showToast],
  );

  // Background refreshes stay quiet about failures, which the next click reports, except a
  // session that is no longer valid (e.g. after the operator restored the initial state).
  const handleBackgroundError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.code === 'unauthenticated') endSession(apiErrorMessage(error));
    },
    [endSession],
  );

  const loadAccount = useCallback(async () => {
    const result = await run(() => requestJson<Account>('/auth/me'));
    if (result) {
      setConsoleActor({ username: result.username, role: result.role });
      setAccount(result);
    }
  }, [run]);

  useEffect(() => {
    if (!getAccessToken()) {
      navigate('/login', { replace: true });
      return;
    }
    void loadAccount();
  }, [loadAccount, navigate]);

  const logout = () => endSession();

  const roleLabel = account?.role ? account.role.charAt(0).toUpperCase() + account.role.slice(1) : 'Account';
  const isRestaurant = account?.role === 'restaurant';
  const isOperator = account?.role === 'operator';

  // The console and footer close every page. The restaurant and operator layouts place them in
  // their content column, beside the sidebar; other roles show them full width under the page.
  const pageEnd = (
    <>
      <OutputConsole />

      <footer className="site-footer">
        <strong>EatChinese</strong>
        <span>Chinese food, found locally in Montréal.</span>
      </footer>
    </>
  );

  return (
    <main className="dashboard-shell">
      <ToastRegion toast={toast} onDismiss={dismissToast} onPause={pauseToast} onResume={resumeToast} />

      {account?.role === 'customer' ? (
        <CustomerDashboard
          account={account}
          busy={busy}
          run={run}
          showToast={showToast}
          onAccountChange={setAccount}
          onLogout={logout}
        />
      ) : account?.role === 'courier' ? (
        <CourierDashboard
          account={account}
          busy={busy}
          run={run}
          showToast={showToast}
          onLogout={logout}
          onBackgroundError={handleBackgroundError}
        />
      ) : isRestaurant ? (
        <RestaurantDashboard
          account={account}
          busy={busy}
          run={run}
          showToast={showToast}
          onAccountChange={setAccount}
          onLogout={logout}
          onBackgroundError={handleBackgroundError}
        >
          {pageEnd}
        </RestaurantDashboard>
      ) : isOperator ? (
        <OperatorDashboard
          account={account}
          busy={busy}
          run={run}
          showToast={showToast}
          onLogout={logout}
          onBackgroundError={handleBackgroundError}
        >
          {pageEnd}
        </OperatorDashboard>
      ) : (
        <>
          <DashboardHeader account={account} onLogout={logout} />
          <div className="dashboard-main customer-main">
            {account ? (
              <section className="panel">
                <h1>{roleLabel} account</h1>
                <p className="muted">
                  This demo currently focuses on customer ordering and restaurant order management.
                </p>
              </section>
            ) : (
              <section className="panel">
                <p className="muted">Loading your account…</p>
              </section>
            )}
          </div>
        </>
      )}

      {isRestaurant || isOperator ? null : pageEnd}
    </main>
  );
}
