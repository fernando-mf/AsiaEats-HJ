import { ConfirmDialog } from '../feedback/ConfirmDialog';

type RestoreDialogProps = {
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

// RestoreDialog confirms restoring the initial state, which cannot be undone.
export function RestoreDialog({ open, busy, onCancel, onConfirm }: RestoreDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title="Restore the initial state?"
      confirmLabel="Restore initial state"
      busyLabel="Restoring…"
      cancelLabel="Keep current data"
      busy={busy}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <p>
        Every order, event and registered account is deleted, and the seeded accounts, restaurants and menus are loaded
        again. This can’t be undone.
      </p>
      <p>Accounts are re-created, so everyone is signed out, you included.</p>
    </ConfirmDialog>
  );
}
