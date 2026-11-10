import type { ToastMessage } from './useToast';
import './toast.css';

type ToastRegionProps = {
  toast: ToastMessage | null;
  onDismiss: () => void;
  // Hovering or focusing the toast pauses its auto-dismiss, so its buttons can be reached.
  onPause: () => void;
  onResume: () => void;
};

export function ToastRegion({ toast, onDismiss, onPause, onResume }: ToastRegionProps) {
  if (!toast) return null;

  const { action } = toast;

  function runAction() {
    if (!action) return;
    onDismiss();
    action.onClick();
  }

  return (
    <div className="toast-region" aria-live={toast.variant === 'error' ? 'assertive' : 'polite'} aria-atomic="true">
      <div
        className={`toast toast--${toast.variant}${action ? ' toast--with-action' : ''}`}
        role={toast.variant === 'error' ? 'alert' : 'status'}
        onMouseEnter={onPause}
        onMouseLeave={onResume}
        onFocus={onPause}
        onBlur={event => {
          if (!event.currentTarget.contains(event.relatedTarget)) onResume();
        }}
      >
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
        {action ? (
          <button className="toast-action" type="button" onClick={runAction}>
            {action.label}
          </button>
        ) : null}
        <button className="toast-dismiss" type="button" onClick={onDismiss} aria-label="Dismiss notification">
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="m6 6 8 8m0-8-8 8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
