import { useEffect, useRef, useState, type FormEvent } from 'react';
import { logError } from '../../shared/console/outputConsole';
import type { Order } from '../dashboard/dashboard.types';
import { orderNumber } from './orderTime';
import './reject-dialog.css';

type RejectDialogProps = {
  // The order being rejected; the dialog is open while this is set.
  order: Order | null;
  busy: string | null;
  onClose: () => void;
  onReject: (order: Order, reason: string) => Promise<void>;
};

// RejectDialog asks why an order is rejected; the customer sees the reason on their order.
// Limits mirror the backend's OrderRejectionRequest (3 to 500 characters).
export function RejectDialog({ order, busy, onClose, onReject }: RejectDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (order && !dialog.open) dialog.showModal();
    if (!order && dialog.open) dialog.close();
  }, [order]);

  function close() {
    setReason('');
    setError(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;
    const trimmed = reason.trim();
    if (trimmed.length < 3 || trimmed.length > 500) {
      const message = 'Give a reason between 3 and 500 characters.';
      setError(message);
      logError('RejectOrderCommand', message);
      return;
    }
    await onReject(order, trimmed);
    setReason('');
    setError(null);
  }

  return (
    <dialog
      ref={dialogRef}
      className="reject-dialog"
      aria-labelledby="reject-dialog-title"
      onCancel={event => {
        event.preventDefault();
        close();
      }}
    >
      <form className="reject-dialog-content" onSubmit={handleSubmit} noValidate>
        <h2 id="reject-dialog-title">Reject {order ? orderNumber(order) : 'order'}?</h2>
        <p>The customer sees this reason on their order. Rejected orders aren’t charged.</p>
        <div className="field-group">
          <label htmlFor="reject-reason">Reason</label>
          <textarea
            id="reject-reason"
            rows={3}
            value={reason}
            onChange={event => setReason(event.target.value)}
            placeholder="e.g. We’re out of an ingredient for this dish."
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'reject-reason-error' : undefined}
          />
          {error ? (
            <p className="field-error" id="reject-reason-error">
              {error}
            </p>
          ) : null}
        </div>
        <div className="reject-dialog-actions">
          <button className="secondary-button" type="button" onClick={close}>
            Keep order
          </button>
          <button className="danger-button" type="submit" disabled={busy !== null}>
            Reject order
          </button>
        </div>
      </form>
    </dialog>
  );
}
