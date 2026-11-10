import { useEffect, useRef } from 'react';

type RestoreDialogProps = {
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

// RestoreDialog confirms restoring the initial state, which cannot be undone. It reuses the
// customer's "switch restaurant" dialog styles.
export function RestoreDialog({ open, busy, onCancel, onConfirm }: RestoreDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="restaurant-switch-dialog"
      aria-labelledby="restore-title"
      aria-describedby="restore-description"
      onCancel={event => {
        event.preventDefault();
        onCancel();
      }}
    >
      <div className="restaurant-switch-dialog-content">
        <h2 id="restore-title">Restore the initial state?</h2>
        <div id="restore-description">
          <p>
            Every order, event and registered account is deleted, and the seeded accounts, restaurants and menus are
            loaded again. This can’t be undone.
          </p>
          <p>Accounts are re-created, so everyone is signed out, you included.</p>
        </div>
        <div className="restaurant-switch-dialog-actions">
          <button className="secondary-button" type="button" autoFocus disabled={busy} onClick={onCancel}>
            Keep current data
          </button>
          <button className="danger-button restaurant-switch-confirm" type="button" disabled={busy} onClick={onConfirm}>
            {busy ? 'Restoring…' : 'Restore initial state'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
