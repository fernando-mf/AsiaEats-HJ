import type { ToastMessage } from './useToast';
import './toast.css';

export function ToastRegion({ toast, onDismiss }: { toast: ToastMessage | null; onDismiss: () => void }) {
  if (!toast) return null;

  return (
    <div className="toast-region" aria-live={toast.variant === 'error' ? 'assertive' : 'polite'} aria-atomic="true">
      <div className={`toast toast--${toast.variant}`} role={toast.variant === 'error' ? 'alert' : 'status'}>
        <span className="toast-icon" aria-hidden="true">
          {toast.variant === 'success' ? (
            <svg viewBox="0 0 20 20">
              <path d="m4.5 10 3.2 3.2 7.8-7.8" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20">
              <path d="M10 5.5v5.25M10 14.25v.25" />
            </svg>
          )}
        </span>
        <p>{toast.message}</p>
        <button type="button" onClick={onDismiss} aria-label="Dismiss notification">
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="m6 6 8 8m0-8-8 8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
