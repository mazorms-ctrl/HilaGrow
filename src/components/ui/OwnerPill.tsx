import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OwnerPillProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

export function OwnerPill({ name, className, style }: OwnerPillProps) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center gap-1.5 rounded-[6px] border border-neutral-900/8 bg-none bg-[#F3F1F1] px-2.5 py-0.5',
        className
      )}
      style={style}
    >
      <User className="h-3.5 w-3.5 text-neutral-900/45" />
      <span className="text-xs font-[Rubik] font-semibold text-neutral-900">{name}</span>
    </span>
  );
}
