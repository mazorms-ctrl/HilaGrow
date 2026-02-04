import { useIsMutating } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';

/**
 * Hook that tracks the auto-save status
 * Returns whether data is currently being saved and the last save timestamp
 */
export function useAutoSaveStatus() {
  const isMutating = useIsMutating();
  const [lastSaved, setLastSaved] = useState<Date | undefined>(undefined);
  const prevIsMutatingRef = useRef(isMutating);

  useEffect(() => {
    // When mutation completes (goes from >0 to 0), update lastSaved timestamp
    if (prevIsMutatingRef.current > 0 && isMutating === 0) {
      setLastSaved(new Date());
    }
    
    prevIsMutatingRef.current = isMutating;
  }, [isMutating]);

  return {
    isSaving: isMutating > 0,
    lastSaved,
  };
}
