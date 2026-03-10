import { AlertCircle, CheckCircle2, Bookmark } from 'lucide-react';
import { useGroupProgressStats, type GroupProgressStat } from '@/lib/supabase-hooks';
import { colors, radius, shadows, spacing, typography } from '@/styles/tokens';

// ── Animation keyframes (injected once) ──────────────────────────────────────

const ANIMATION_CSS = `
@keyframes groupCardFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveColor(color: string | null): string {
  return color ?? colors.brand.primary;
}

// Darken a hex color slightly for text contrast
function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([a-fA-F0-9]{6})$/.exec(hex.trim());
  if (!m) return null;
  const v = m[1];
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function colorWithAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(59,130,246,${alpha})`;
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function TeamProgressBar({ percent, color }: { percent: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
      <div
        style={{
          flex: 1,
          height: 8,
          borderRadius: radius.full,
          background: colorWithAlpha(color, 0.15),
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${clamped}%`,
            height: '100%',
            borderRadius: radius.full,
            background: color,
            transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        />
      </div>
      <span
        style={{
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.bold,
          color,
          flexShrink: 0,
          width: 36,
          textAlign: 'left',
          fontFamily: typography.fontFamily,
        }}
      >
        {clamped}%
      </span>
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({
  value,
  label,
  variant,
}: {
  value: number;
  label: string;
  variant: 'neutral' | 'success' | 'danger';
}) {
  const palette = {
    neutral: { bg: colors.surface.hover,          text: colors.text.tertiary  },
    success: { bg: colors.semantic.successLight,  text: colors.semantic.success },
    danger:  { bg: colors.semantic.dangerLight,   text: colors.semantic.danger  },
  }[variant];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold,
        color: palette.text,
        background: palette.bg,
        padding: '2px 8px',
        borderRadius: radius.full,
        whiteSpace: 'nowrap',
      }}
    >
      {variant === 'success' && <CheckCircle2 size={10} />}
      {variant === 'danger'  && <AlertCircle  size={10} />}
      {value} {label}
    </span>
  );
}

// ── Single team card ──────────────────────────────────────────────────────────

function TeamCard({ stat, index }: { stat: GroupProgressStat; index: number }) {
  const accentColor = resolveColor(stat.group_color);
  const hasWork     = !!stat.current_work;
  const allDone     = stat.leaf_task_count > 0 && stat.completed_count === stat.leaf_task_count;

  return (
    <div
      style={{
        background: colors.surface.elevated,
        borderRadius: radius.lg,
        border: `1px solid ${colors.border.light}`,
        borderRight: `4px solid ${accentColor}`,   // RTL accent stripe on the start edge
        boxShadow: shadows.sm,
        padding: spacing.xl,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.md,
        // Staggered fade-in
        opacity: 0,
        animation: `groupCardFadeIn 0.35s ease forwards`,
        animationDelay: `${index * 0.07}s`,
      }}
    >
      {/* Team name row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }}>
        <h3
          style={{
            margin: 0,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            fontFamily: typography.fontFamily,
            lineHeight: typography.lineHeight.tight,
          }}
        >
          {stat.group_name}
        </h3>

        {stat.overdue_count > 0 && (
          <StatPill value={stat.overdue_count} label="באיחור" variant="danger" />
        )}
        {stat.overdue_count === 0 && allDone && (
          <StatPill value={stat.completed_count} label="הושלמו" variant="success" />
        )}
      </div>

      {/* Progress bar */}
      <TeamProgressBar percent={stat.avg_progress} color={accentColor} />

      {/* Task count sub-line */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
          {stat.completed_count} / {stat.leaf_task_count} משימות הושלמו
        </span>
        {stat.overdue_count === 0 && !allDone && stat.leaf_task_count > 0 && (
          <StatPill value={stat.leaf_task_count - stat.completed_count} label="בביצוע" variant="neutral" />
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: colors.border.light, margin: `0 -${spacing.xl}` }} />

      {/* Current work */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.xs, minWidth: 0 }}>
        <Bookmark
          size={13}
          color={hasWork ? accentColor : colors.text.disabled}
          style={{ flexShrink: 0, marginTop: 2 }}
        />
        <span
          style={{
            fontSize: typography.fontSize.xs,
            color: hasWork ? colors.text.secondary : colors.text.disabled,
            fontStyle: hasWork ? 'normal' : 'italic',
            lineHeight: typography.lineHeight.normal,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          } as React.CSSProperties}
        >
          {hasWork ? stat.current_work! : 'אין משימה פעילה כרגע'}
        </span>
      </div>
    </div>
  );
}

// ── Skeleton card (loading state) ─────────────────────────────────────────────

function SkeletonCard() {
  const pulse = `pulseOpacity 1.4s ease-in-out infinite`;
  return (
    <div
      style={{
        background: colors.surface.elevated,
        borderRadius: radius.lg,
        border: `1px solid ${colors.border.light}`,
        borderRight: `4px solid ${colors.border.default}`,
        padding: spacing.xl,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.md,
      }}
    >
      <div style={{ height: 16, width: '55%', borderRadius: radius.sm, background: colors.surface.hover, animation: pulse }} />
      <div style={{ height: 8,  width: '100%', borderRadius: radius.full, background: colors.surface.hover, animation: pulse, animationDelay: '0.1s' }} />
      <div style={{ height: 12, width: '40%', borderRadius: radius.sm,  background: colors.surface.hover, animation: pulse, animationDelay: '0.2s' }} />
      <div style={{ height: 1,  background: colors.border.light }} />
      <div style={{ height: 12, width: '75%', borderRadius: radius.sm,  background: colors.surface.hover, animation: pulse, animationDelay: '0.15s' }} />
    </div>
  );
}

// ── GroupProgressMap ──────────────────────────────────────────────────────────

export function GroupProgressMap() {
  const { data: stats = [], isLoading } = useGroupProgressStats();

  return (
    <div dir="rtl">
      <style>{ANIMATION_CSS}{`
        @keyframes pulseOpacity {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>

      {/* Grid */}
      {isLoading ? (
        <div style={gridStyle}>
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : stats.length === 0 ? (
        <div
          style={{
            padding: `${spacing.xxxxl} 0`,
            textAlign: 'center',
            color: colors.text.tertiary,
            fontSize: typography.fontSize.sm,
          }}
        >
          אין קבוצות מוגדרות עדיין
        </div>
      ) : (
        <div style={gridStyle}>
          {stats.map((stat, i) => (
            <TeamCard key={stat.group_id} stat={stat} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

// Responsive grid defined as a plain object — injected via style prop.
// Tailwind isn't used here to stay consistent with the inline-styles convention
// of the other dashboard components. The media query is handled via a <style> block.
const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: spacing.lg,
};
