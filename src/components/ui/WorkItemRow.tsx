import { cn } from '@/lib/utils';
import { Badge } from './Badge';
import { OwnerPill } from './OwnerPill';
import { ProgressBar } from './ProgressBar';
import { Eye } from 'lucide-react';

interface WorkItemRowProps {
  title: string;
  priority: 'P1' | 'P2' | 'P3';
  category?: {
    label: string;
    variant: 'purple' | 'blue' | 'green';
  };
  accentColor?: string;
  owner?: string;
  progress: {
    current: number;
    total: number;
  };
  nextStep?: string;
  milestones?: Array<{
    text?: string;
    title?: string;
    done?: boolean;
  }>;
  onClick?: () => void;
  onQuickView?: () => void;
  className?: string;
}

export function WorkItemRow({
  title,
  priority,
  category,
  accentColor,
  owner,
  progress,
  nextStep,
  milestones,
  onClick,
  onQuickView,
  className,
}: WorkItemRowProps) {
  const hexToRgba = (hex: string, alpha: number) => {
    const normalized = hex.trim();
    const match = /^#?([a-fA-F0-9]{6})$/.exec(normalized);
    if (!match) return `rgba(0,0,0,${alpha})`;
    const value = match[1];
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const priorityBg = {
    P1: 'bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.32)]',
    P2: 'bg-[rgba(234,88,12,0.08)] border-[rgba(234,88,12,0.28)]',
    P3: 'bg-[rgba(2,132,199,0.08)] border-[rgba(2,132,199,0.28)]',
  };

  const getProgressVariant = () => {
    const pct = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
    if (pct === 100) return 'success';
    if (pct >= 75) return 'primary';
    if (pct >= 50) return 'warning';
    return 'danger';
  };

  const categoryVariants = {
    purple: 'bg-[#EDE9FE] text-[#7C3AED] border-[rgba(124,58,237,0.15)]',
    blue:   'bg-[#DBEAFE] text-[#2563EB] border-[rgba(37,99,235,0.15)]',
    green:  'bg-[#DCFCE7] text-[#16A34A] border-[rgba(22,163,74,0.15)]',
  };

  const milestonesDone = milestones?.filter(m => m.done).length ?? 0;

  return (
    <div
      className={cn(
        'group relative flex flex-col min-h-[72px] gap-1.5 rounded-md border px-4 py-3',
        'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-hover',
        !accentColor && priorityBg[priority],
        className
      )}
      style={
        accentColor
          ? {
              borderRightWidth: '4px',
              borderRightStyle: 'solid',
              borderRightColor: accentColor,
              backgroundColor: hexToRgba(accentColor, 0.06),
              borderColor: hexToRgba(accentColor, 0.32),
            }
          : undefined
      }
      dir="rtl"
    >
      {/* Main clickable row */}
      <div
        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 cursor-pointer"
        dir="rtl"
        onClick={onClick}
      >
        {/* Right: priority badge + title + category + owner */}
        <div className="flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-3 min-w-0 w-full md:w-auto">
          <Badge variant={priority}>{priority}</Badge>

          <h3
            className="text-[16px] font-[Rubik] font-medium text-neutral-900 hover:text-neutral-700 text-right truncate"
            title={title}
          >
            {title}
          </h3>

          {category && (
            <span
              className={cn(
                'inline-flex h-[22px] items-center rounded-[6px] border px-2.5 py-0.5 text-xs font-[Rubik] font-bold flex-shrink-0',
                !accentColor && categoryVariants[category.variant]
              )}
              style={
                accentColor
                  ? {
                      backgroundColor: hexToRgba(accentColor, 0.12),
                      borderColor:     hexToRgba(accentColor, 0.28),
                      color:           accentColor,
                    }
                  : undefined
              }
            >
              {category.label}
            </span>
          )}

          {owner && <OwnerPill name={owner} className="flex-shrink-0 hidden sm:flex" />}
        </div>

        {/* Left: eye button + progress count + bar */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 w-full md:w-auto justify-end" dir="ltr">
          {onQuickView && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onQuickView(); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '28px', height: '28px', borderRadius: '7px',
                border: '1px solid #e0e7ff', background: '#eef2ff',
                color: '#6366f1', cursor: 'pointer', flexShrink: 0,
                transition: 'background 0.12s, border-color 0.12s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#e0e7ff';
                e.currentTarget.style.borderColor = '#c7d2fe';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#eef2ff';
                e.currentTarget.style.borderColor = '#e0e7ff';
              }}
              aria-label="תצוגה מהירה"
              title="תצוגה מהירה"
            >
              <Eye size={14} />
            </button>
          )}

          <span className="text-sm font-semibold text-neutral-600 tabular-nums" dir="ltr">
            {progress.current}/{progress.total}
          </span>

          <div className="w-[100px] md:w-[160px]">
            <ProgressBar
              value={progress.current}
              max={progress.total}
              variant={getProgressVariant()}
              className="h-2.5"
            />
          </div>
        </div>
      </div>

      {/* Second row: goal preview + milestone chips */}
      {(nextStep || (milestones && milestones.length > 0)) && (
        <div
          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-right text-xs font-medium text-neutral-500 cursor-pointer"
          onClick={onClick}
        >
          {nextStep && <span className="min-w-0 break-words">{nextStep}</span>}

          {milestones && milestones.length > 0 && (
            <>
              {nextStep && <span className="mx-1 text-neutral-300">|</span>}
              <span className="text-neutral-400 whitespace-nowrap">אבני דרך:</span>
              <span className="tabular-nums whitespace-nowrap">{milestonesDone}/{milestones.length}</span>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                {milestones.slice(0, 3).map((m, i) => {
                  const label = m.title ?? m.text ?? '';
                  return (
                    <span
                      key={`${label}-${i}`}
                      title={label}
                      className={cn(
                        'whitespace-nowrap font-[Rubik] border border-[rgba(198,201,205,1)] bg-white px-px py-0.5 rounded-[3px] text-center',
                        m.done ? 'text-neutral-400 line-through' : 'text-neutral-600'
                      )}
                    >
                      {label}
                    </span>
                  );
                })}
                {milestones.length > 3 && (
                  <span className="text-neutral-400 tabular-nums whitespace-nowrap">
                    +{milestones.length - 3}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
