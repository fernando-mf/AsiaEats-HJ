import { useCallback, useEffect, useState } from 'react';
import { requestJson } from '../../shared/api/client';
import { DashboardHeader } from './DashboardHeader';
import type { Account, CourierProfile, CourierStatus, RunAction, ShowToast } from './dashboard.types';

type CourierDashboardProps = {
  account: Account;
  busy: string | null;
  run: RunAction;
  showToast: ShowToast;
  onLogout: () => void;
};

const statusPills: Record<CourierStatus, string> = {
  offline: 'pill--neutral',
  idle: 'pill--green',
  assigned: 'pill--amber',
  carrying: 'pill--accent',
};

const statusDescriptions: Record<CourierStatus, string> = {
  offline: 'You are off duty. Go on duty to start receiving delivery offers.',
  idle: 'You are on duty and waiting for a delivery offer.',
  assigned: 'An order has been assigned to you. Head to the restaurant to pick it up.',
  carrying: 'You are carrying an order. Deliver it before going off duty.',
};

// CourierDashboard is the courier's view of the dashboard. It shows the courier's duty status
// and lets them go on or off duty (R-DLV-03). The offer panel (#136) and the pickup and delivery
// buttons (#137) are added below the duty panel.
export function CourierDashboard({ account, busy, run, showToast, onLogout }: CourierDashboardProps) {
  const [profile, setProfile] = useState<CourierProfile | null>(null);

  const loadProfile = useCallback(async () => {
    const result = await run(() => requestJson<CourierProfile>('/couriers/me'));
    if (result) setProfile(result);
    return result;
  }, [run]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  // Both duty routes answer 204 with no body, so the profile is loaded again to show the new status.
  async function changeDuty(duty: 'online' | 'offline') {
    const done = await run(async () => {
      await requestJson<void>(`/couriers/me/${duty}`, { method: 'POST' });
      return true;
    });
    if (!done) return;
    const updated = await loadProfile();
    if (updated) showToast(duty === 'online' ? 'You are now on duty.' : 'You are now off duty.');
  }

  const status = profile?.status;
  const canGoOffDuty = status !== undefined && status !== 'offline' && status !== 'carrying';

  return (
    <>
      <DashboardHeader account={account} onLogout={onLogout} />
      <div className="dashboard-main customer-main">
        <p className="eyebrow">Courier</p>

        <section className="panel" aria-labelledby="courier-duty-title">
          <h1 id="courier-duty-title">Duty status</h1>
          {status ? (
            <>
              <p>
                <span className={`pill ${statusPills[status]}`}>{status}</span>
              </p>
              <p className="muted">{statusDescriptions[status]}</p>
              <p>
                {status === 'offline' ? (
                  <button
                    className="primary-button"
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void changeDuty('online')}
                  >
                    Go on duty
                  </button>
                ) : (
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={busy !== null || !canGoOffDuty}
                    title={status === 'carrying' ? 'Deliver the order you are carrying first.' : undefined}
                    onClick={() => void changeDuty('offline')}
                  >
                    Go off duty
                  </button>
                )}
              </p>
            </>
          ) : (
            <p className="muted">
              {busy !== null ? 'Loading your courier status…' : 'Your courier status is unavailable.'}
            </p>
          )}
          {!status && busy === null ? (
            <button className="secondary-button" type="button" onClick={() => void loadProfile()}>
              Try again
            </button>
          ) : null}
        </section>

        {/* #136 offer panel and #137 pickup/delivery buttons go here. */}
      </div>
    </>
  );
}
