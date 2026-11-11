import { useCallback, useEffect, useRef, useState } from 'react';

export type ToastVariant = 'success' | 'error';

// A button shown in the toast, e.g. "View cart" after adding a dish.
export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastMessage = {
  id: number;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
};

// A toast with an action stays longer, so there is time to read it and then click.
const ACTION_DISMISS_MS = 5000;

export function useToast(autoDismissMs = 2600) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  // While hovered or focused the toast does not dismiss itself; the timer restarts on leaving.
  const [paused, setPaused] = useState(false);
  const nextId = useRef(0);

  const showToast = useCallback((message: string, variant: ToastVariant = 'success', action?: ToastAction) => {
    nextId.current += 1;
    setToast({ id: nextId.current, message, variant, action });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
    setPaused(false);
  }, []);

  const pauseToast = useCallback(() => setPaused(true), []);
  const resumeToast = useCallback(() => setPaused(false), []);

  useEffect(() => {
    if (!toast || paused) return;
    const timeout = window.setTimeout(dismissToast, toast.action ? ACTION_DISMISS_MS : autoDismissMs);
    return () => window.clearTimeout(timeout);
  }, [autoDismissMs, dismissToast, paused, toast]);

  return { toast, showToast, dismissToast, pauseToast, resumeToast };
}
