import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomerDashboard } from '../components/dashboard/CustomerDashboard';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { RestaurantDashboard } from '../components/dashboard/RestaurantDashboard';
import type { Account } from '../components/dashboard/dashboard.types';
import { OutputConsole } from '../components/feedback/OutputConsole';
import { ToastRegion } from '../components/feedback/ToastRegion';
import { useToast } from '../components/feedback/useToast';
import { ApiError, apiErrorMessage, clearAccessToken, getAccessToken, requestJson } from '../shared/api/client';
import { clearStoredCart } from '../shared/cart/cartStorage';
import { setConsoleActor } from '../shared/console/outputConsole';
import { clearDashboardSession } from '../shared/dashboard/dashboardSession';
import './dashboard.css';

export function DashboardPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { toast, showToast, dismissToast } = useToast();

  const run = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
      setBusy('loading');
      try {
        return await action();
      } catch (error) {
        showToast(apiErrorMessage(error), 'error');
        if (error instanceof ApiError && error.code === 'unauthenticated') {
          setConsoleActor(undefined);
          clearAccessToken();
          navigate('/login', { replace: true });
        }
        return undefined;
      } finally {
        setBusy(null);
      }
    },
    [navigate, showToast],
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

  function logout() {
    clearStoredCart();
    clearDashboardSession();
    setConsoleActor(undefined);
    clearAccessToken();
    navigate('/login', { replace: true });
  }

  const roleLabel = account?.role ? account.role.charAt(0).toUpperCase() + account.role.slice(1) : 'Account';

  return (
    <main className="dashboard-shell">
      <ToastRegion toast={toast} onDismiss={dismissToast} />

      {account?.role === 'customer' ? (
        <CustomerDashboard account={account} busy={busy} run={run} showToast={showToast} onLogout={logout} />
      ) : account?.role === 'restaurant' ? (
        <RestaurantDashboard account={account} busy={busy} run={run} showToast={showToast} onLogout={logout} />
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

      <OutputConsole />

      <footer className="site-footer">
        <strong>EatChinese</strong>
        <span>Chinese food, found locally in Montréal.</span>
      </footer>
    </main>
  );
}
