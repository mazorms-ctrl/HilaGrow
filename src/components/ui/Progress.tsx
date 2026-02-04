import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number; // 0-100
  color?: 'primary' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, color = 'primary', showLabel = false, ...props }, ref) => {
    const clampedValue = Math.min(100, Math.max(0, value));
    
    return (
      <div
        ref={ref}
        className={cn("relative w-full", className)}
        {...props}
      >
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
          <div
            className={cn(
              "h-full transition-all duration-300 ease-in-out",
              {
                'bg-primary-500': color === 'primary',
                'bg-success-500': color === 'success',
                'bg-warning-500': color === 'warning',
                'bg-danger-500': color === 'danger',
              }
            )}
            style={{ width: `${clampedValue}%` }}
          />
        </div>
        {showLabel && (
          <span className="mt-1 text-xs text-muted-foreground">
            {Math.round(clampedValue)}%
          </span>
        )}
      </div>
    );
  }
);

Progress.displayName = "Progress";

export { Progress };
