import { useEffect } from 'react';

/**
 * Locks document.body scroll while `shouldLock` is true.
 * Layout shift is prevented by `scrollbar-gutter: stable` in index.css —
 * no paddingRight compensation needed here.
 *
 * Uses a module-level counter so multiple concurrent locks (e.g. modal +
 * drawer open at the same time) don't corrupt each other's cleanup.
 */

let lockCount = 0;

/** Force-release the scroll lock and reset the counter.
 *  Called by AppRouter on every navigation to handle the race where a modal
 *  unmounts mid-navigation before its own cleanup decrements the counter. */
export function forceReleaseScrollLock() {
  lockCount = 0;
  document.body.style.overflow = '';
}

export function useBodyScrollLock(shouldLock: boolean) {
  useEffect(() => {
    if (!shouldLock) return;

    lockCount++;
    if (lockCount === 1) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = '';
      }
    };
  }, [shouldLock]);
}
