import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant: 'P1' | 'P2' | 'P3';
  className?: string;
  style?: React.CSSProperties;
}

export function Badge({ children, variant, className, style }: BadgeProps) {
  const variants = {
    P1: 'bg-[#FEE2E2] border-[rgba(239,68,68,1)] text-[#DC2626]',
    P2: 'bg-[#FED7AA] border-[#FDBA74] text-[#EA580C]',
    P3: 'bg-[#DBEAFE] border-[#BAE6FD] text-[#0284C7]',
  };

  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-[5px] border text-[13px] font-extrabold',
        variants[variant],
        className
      )}
      style={{ paddingLeft: '5px', paddingRight: '5px', ...style }}
    >
      {children}
    </span>
  );
}
