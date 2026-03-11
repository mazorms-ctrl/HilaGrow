import { useEffect } from 'react';

/**
 * Locks document.body scroll while `shouldLock` is true.
 * Restores on cleanup (unmount or when shouldLock becomes false).
 */
export function useBodyScrollLock(shouldLock: boolean) {
  useEffect(() => {
    if (!shouldLock) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [shouldLock]);
}
