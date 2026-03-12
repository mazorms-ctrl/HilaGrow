import { useEffect } from 'react';

/**
 * Locks document.body scroll while `shouldLock` is true.
 * Restores on cleanup (unmount or when shouldLock becomes false).
 */
export function useBodyScrollLock(shouldLock: boolean) {
  useEffect(() => {
    if (!shouldLock) return;
    // Measure actual scrollbar width before hiding so we can compensate
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [shouldLock]);
}
