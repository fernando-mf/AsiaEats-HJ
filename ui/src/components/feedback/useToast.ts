import { useCallback, useEffect, useRef, useState } from 'react';

export type ToastVariant = 'success' | 'error';

export type ToastMessage = {
  id: number;
  message: string;
  variant: ToastVariant;
};

export function useToast(autoDismissMs = 2600) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const nextId = useRef(0);

  const showToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    nextId.current += 1;
    setToast({ id: nextId.current, message, variant });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(dismissToast, autoDismissMs);
    return () => window.clearTimeout(timeout);
  }, [autoDismissMs, dismissToast, toast]);

  return { toast, showToast, dismissToast };
}
