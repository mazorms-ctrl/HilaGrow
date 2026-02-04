import { useEffect, useState } from 'react';
import { CheckCircle2, Cloud, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutoSaveIndicatorProps {
  isSaving?: boolean;
  lastSaved?: Date;
  className?: string;
}

export function AutoSaveIndicator({ 
  isSaving = false, 
  lastSaved,
  className 
}: AutoSaveIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (!isSaving && lastSaved) {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSaving, lastSaved]);

  return (
    <div 
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all",
        className
      )}
      dir="rtl"
    >
      {isSaving ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span className="font-medium text-neutral-600">שומר...</span>
        </>
      ) : showSaved ? (
        <>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="font-medium text-green-600">נשמר</span>
        </>
      ) : (
        <>
          <Cloud className="h-4 w-4 text-neutral-400" />
          <span className="text-xs text-neutral-500">
            {lastSaved ? (
              <>שמירה אוטומטית מופעלת</>
            ) : (
              <>כל השינויים נשמרים אוטומטית</>
            )}
          </span>
        </>
      )}
    </div>
  );
}
