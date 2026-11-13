import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, requestJson } from '../../shared/api/client';
import { AssignmentPanel } from '../courier/AssignmentPanel';
import { DashboardHeader } from './DashboardHeader';
import type {
  Account,
  CourierAssignment,
  CourierProfile,
  CourierStatus,
  RunAction,
  ShowToast,
} from './dashboard.types';

type CourierDashboardProps = {
  account: Account;
  busy: string | null;
  run: RunAction;
  showToast: ShowToast;
  onLogout: () => void;
  // Receives a failed background refresh; it ends the session when the session is no longer valid.
  onBackgroundError: (error: unknown) => void;
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

// fetchAssignment reads the courier's active assignment. The backend answers 404 not_found when
// nothing is offered or assigned, which is a normal state here, so it resolves to null instead
// of failing (and the console does not list it as an error).
async function fetchAssignment(): Promise<CourierAssignment | null> {
  try {
    return await requestJson<CourierAssignment>('/couriers/me/assignment', { notFoundExpected: true });
  } catch (error) {
    if (error instanceof ApiError && error.code === 'not_found') return null;
    throw error;
  }
}

// CourierDashboard is the courier's view of the dashboard (R-DASH-01). It shows the courier's
// duty status and lets them go on or off duty (R-DLV-03), and shows the order offered to them so
// they can accept or decline it (R-DLV-02). The pickup and delivery buttons (#137) go in the
// assignment panel.
export function CourierDashboard({
  account,
  busy,
  run,
  showToast,
  onLogout,
  onBackgroundError,
}: CourierDashboardProps) {
  const [profile, setProfile] = useState<CourierProfile | null>(null);
  const [assignment, setAssignment] = useState<CourierAssignment | null>(null);
  // The background refresh reads busy through a ref so the timer isn't restarted on every action.
  const busyRef = useRef(busy);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  const loadProfile = useCallback(async () => {
    const result = await run(() => requestJson<CourierProfile>('/couriers/me'));
    if (result) setProfile(result);
    return result;
  }, [run]);

  const loadAssignment = useCallback(async () => {
    const result = await run(fetchAssignment);
    // undefined means the request failed (run already showed the error); keep what is shown.
    if (result !== undefined) setAssignment(result);
    return result;
  }, [run]);

  // loadAll refreshes the status and the assignment, one after the other so busy stays set
  // until both are back. Called when the view opens and after every courier action.
  const loadAll = useCallback(async () => {
    const updated = await loadProfile();
    await loadAssignment();
    return updated;
  }, [loadAssignment, loadProfile]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const status = profile?.status;
  const idle = status === 'idle';

  // A courier stays idle while an order is offered to them, so new offers (and offers that are
  // withdrawn) are found by refreshing quietly every 15 s while idle, skipping while an action
  // runs. Once the courier accepts (assigned) or goes off duty, polling stops.
  useEffect(() => {
    if (!idle) return;
    const timer = window.setInterval(() => {
      if (busyRef.current !== null) return;
      fetchAssignment().then(setAssignment).catch(onBackgroundError);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [idle, onBackgroundError]);

  // Both duty routes answer 204 with no body, so the profile is loaded again to show the new status.
  async function changeDuty(duty: 'online' | 'offline') {
    const done = await run(async () => {
      await requestJson<void>(`/couriers/me/${duty}`, { method: 'POST' });
      return true;
    });
    if (!done) return;
    const updated = await loadAll();
    if (updated) showToast(duty === 'online' ? 'You are now on duty.' : 'You are now off duty.');
  }

  // answerOffer accepts or declines the offered order. Both routes answer the updated
  // assignment, but the courier's status changes too, so both are loaded again.
  async function answerOffer(offer: CourierAssignment, answer: 'accept' | 'decline') {
    const done = await run(async () => {
      await requestJson(`/order-assignments/${offer.id}/${answer}`, { method: 'POST' });
      return true;
    });
    // Reload even after a failure: the offer may have been withdrawn, so show what is current.
    await loadAll();
    if (!done) return;
    showToast(
      answer === 'accept'
        ? `Order accepted. Head to ${offer.restaurant.name} to pick it up.`
        : 'Offer declined. It will be offered to another courier.',
    );
  }

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
            <button className="secondary-button" type="button" onClick={() => void loadAll()}>
              Try again
            </button>
          ) : null}
        </section>

        {status && (status !== 'offline' || assignment) ? (
          <AssignmentPanel
            assignment={assignment}
            busy={busy}
            onAccept={offer => void answerOffer(offer, 'accept')}
            onDecline={offer => void answerOffer(offer, 'decline')}
          />
        ) : null}
      </div>
    </>
  );
}
