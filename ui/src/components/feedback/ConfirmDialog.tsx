import { useEffect, useId, useRef, type ReactNode } from 'react';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  // The explanation under the title: what happens if the person confirms.
  children: ReactNode;
  confirmLabel: string;
  // Shown on the confirm button while the action runs, e.g. "Cancelling…".
  busyLabel: string;
  cancelLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

// ConfirmDialog asks before an action that can't be undone, in the site's own style instead of
// the browser's confirm box. Escape and the safe button close it; the safe button has focus.
// It reuses the customer's "switch restaurant" dialog styles.
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  busyLabel,
  cancelLabel,
  busy,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Unique per dialog, so two dialogs on one page (e.g. the operator's cancel and restore) don't
  // share the ids their title and description are announced by.
  const titleId = useId();
  const descriptionId = useId();

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
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={event => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <div className="restaurant-switch-dialog-content">
        <h2 id={titleId}>{title}</h2>
        <div id={descriptionId}>{children}</div>
        <div className="restaurant-switch-dialog-actions">
          <button className="secondary-button" type="button" autoFocus disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="danger-button restaurant-switch-confirm" type="button" disabled={busy} onClick={onConfirm}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
