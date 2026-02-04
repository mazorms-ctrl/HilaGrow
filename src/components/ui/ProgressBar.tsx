import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: 'success' | 'primary' | 'warning' | 'danger';
  className?: string;
  fillStyle?: React.CSSProperties;
}

export function ProgressBar({ 
  value, 
  max = 100, 
  variant = 'primary',
  className,
  fillStyle
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  
  const variants = {
    success: 'bg-[#22C55E]',
    primary: 'bg-[#3B82F6]',
    warning: 'bg-[#F59E0B]',
    danger: 'bg-[#EF4444]',
  };

  return (
    <div
      className={cn(
        'h-1.5 w-full overflow-hidden rounded-pill bg-neutral-900/10',
        className
      )}
    >
      <div
        className={cn(
          'h-full rounded-pill transition-all duration-500 ease-out',
          variants[variant]
        )}
        style={{ width: `${percentage}%`, ...fillStyle }}
      />
    </div>
  );
}
