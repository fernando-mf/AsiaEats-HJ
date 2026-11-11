import { useEffect } from 'react';

// Dashboard pages are switched in place (no route change), so the browser keeps the
// previous page's scroll position. Scroll back to the top whenever `page` changes.
export function useScrollToTop(page: string): void {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [page]);
}
