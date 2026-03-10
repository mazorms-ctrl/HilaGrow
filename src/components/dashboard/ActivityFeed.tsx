import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useActivityFeed, type ActivityFeedEntry } from '@/lib/supabase-hooks';
import { colors, radius, shadows, spacing, typography } from '@/styles/tokens';

// ── Action labels in Hebrew ────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  status_changed:      'שינה סטטוס',
  progress_updated:    'עדכן התקדמות',
  comment_added:       'הוסיף הערה',
  task_created:        'יצר משימה',
  task_updated:        'עדכן משימה',
  milestone_completed: 'השלים אבן דרך',
};

// ── Single compact feed row ────────────────────────────────────────────────────
//
// Format: "14:20  |  ד"ר כהן  עדכן התקדמות  — מחקר קליני"

function FeedRow({ entry }: { entry: ActivityFeedEntry }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const name = entry.profile.full_name || entry.profile.email || 'משתמש';

  const date = (() => {
    try {
      const d = new Date(entry.created_at);
      return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  })();

  const fullTimestamp = (() => {
    try {
      const d = new Date(entry.created_at);
      return d.toLocaleString('he-IL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return '';
    }
  })();

  // Fallback label used only when content is absent (old rows, edge cases)
  const fallbackLabel = ACTION_LABELS[entry.action_type] ?? entry.action_type;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/task/${entry.task_id}`)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/task/${entry.task_id}`); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: spacing.sm,
        padding: '9px 8px',
        margin: '0 -8px',
        borderBottom: `1px solid ${colors.border.light}`,
        fontSize: typography.fontSize.xs,
        lineHeight: typography.lineHeight.normal,
        flexWrap: 'wrap',
        cursor: 'pointer',
        borderRadius: '6px',
        background: hovered ? colors.surface.hover : 'transparent',
        transition: 'background 120ms ease',
        outline: 'none',
      }}
    >
      {/* Date — DD/MM with full timestamp tooltip on hover */}
      <span
        title={fullTimestamp}
        style={{ color: colors.text.tertiary, whiteSpace: 'nowrap', flexShrink: 0, cursor: 'default' }}
      >
        {date}
      </span>

      {/* Separator */}
      <span style={{ color: colors.border.default, flexShrink: 0 }}>|</span>

      {/* Name */}
      <span style={{ fontWeight: typography.fontWeight.semibold, color: colors.text.primary, flexShrink: 0 }}>
        {name}
      </span>

      {/* Action — prefer the specific content from the trigger; fall back to generic label */}
      <span style={{ color: colors.text.secondary }}>
        {entry.content || fallbackLabel}
      </span>

      {/* Task title */}
      {entry.task_title && (
        <span style={{ color: colors.brand.primary, fontWeight: typography.fontWeight.medium }}>
          — {entry.task_title}
        </span>
      )}
    </div>
  );
}

// ── ActivityFeed ──────────────────────────────────────────────────────────────

const PAGE = 4;

export function ActivityFeed() {
  const { data: entries = [], isLoading } = useActivityFeed(40);
  const [page, setPage] = useState(0);

  // Track entry count at the moment the user navigated away from page 0,
  // so we can show a "new activity" badge without disrupting their view.
  const countAtLeaveRef = useRef<number>(0);
  useEffect(() => {
    if (page === 0) {
      countAtLeaveRef.current = entries.length;
    }
  }, [page, entries.length]);

  const totalPages  = Math.max(1, Math.ceil(entries.length / PAGE));
  const safePage    = Math.min(page, totalPages - 1);
  const visible     = entries.slice(safePage * PAGE, (safePage + 1) * PAGE);
  const hasPrev     = safePage > 0;
  const hasNext     = (safePage + 1) * PAGE < entries.length;
  const newActivity = safePage > 0 && entries.length > countAtLeaveRef.current;

  const navBtnStyle = (disabled: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 14px',
    borderRadius: '16px',
    border: `1px solid ${disabled ? colors.border.light : colors.border.default}`,
    background: 'none',
    color: disabled ? colors.text.disabled : colors.text.secondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamily,
    cursor: disabled ? 'default' : 'pointer',
    transition: 'all 120ms ease',
    userSelect: 'none',
  });

  return (
    <div
      dir="rtl"
      style={{
        background: colors.surface.elevated,
        borderRadius: radius.lg,
        border: `1px solid ${colors.border.light}`,
        boxShadow: shadows.md,
        overflow: 'hidden',
      }}
    >
      {/* Header row */}
      <div
        style={{
          padding: `${spacing.md} ${spacing.xl}`,
          borderBottom: `1px solid ${colors.border.light}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
          פעילות אחרונה
        </span>

        {/* Page indicator */}
        {!isLoading && entries.length > PAGE && (
          <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
            {safePage + 1} / {totalPages}
          </span>
        )}
      </div>

      {/* New-activity banner (only on page > 0) */}
      {newActivity && (
        <button
          onClick={() => setPage(0)}
          style={{
            width: '100%',
            padding: '5px',
            border: 'none',
            borderBottom: `1px solid ${colors.brand.light}`,
            background: colors.brand.light,
            color: colors.brand.primary,
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.semibold,
            fontFamily: typography.fontFamily,
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          ← פעילות חדשה זמינה — לחץ לחזרה לעמוד הראשון
        </button>
      )}

      {/* Entry list — fixed height for 4 rows so layout never jumps */}
      <div style={{ padding: `0 ${spacing.xl}` }}>
        {isLoading && (
          <div style={{ padding: `${spacing.xxxl} 0`, textAlign: 'center', color: colors.text.tertiary, fontSize: typography.fontSize.sm }}>
            טוען פעילות…
          </div>
        )}

        {!isLoading && entries.length === 0 && (
          <div style={{ padding: `${spacing.xxxl} 0`, textAlign: 'center', color: colors.text.tertiary, fontSize: typography.fontSize.sm }}>
            אין פעילות עדיין
          </div>
        )}

        {visible.map((entry) => (
          <FeedRow key={entry.id} entry={entry} />
        ))}
      </div>

      {/* Pagination controls */}
      {!isLoading && entries.length > PAGE && (
        <div
          style={{
            padding: `${spacing.sm} ${spacing.xl} ${spacing.md}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: `1px solid ${colors.border.light}`,
          }}
        >
          {/* Next = older entries (higher page index, RTL so on the left) */}
          <button
            disabled={!hasNext}
            onClick={() => !hasNext ? undefined : setPage((p) => p + 1)}
            style={navBtnStyle(!hasNext)}
            onMouseEnter={(e) => { if (hasNext) e.currentTarget.style.color = colors.brand.primary; }}
            onMouseLeave={(e) => { if (hasNext) e.currentTarget.style.color = colors.text.secondary; }}
          >
            <ChevronLeft size={13} />
            הבא
          </button>

          {/* Prev = newer entries (lower page index, RTL so on the right) */}
          <button
            disabled={!hasPrev}
            onClick={() => !hasPrev ? undefined : setPage((p) => p - 1)}
            style={navBtnStyle(!hasPrev)}
            onMouseEnter={(e) => { if (hasPrev) e.currentTarget.style.color = colors.brand.primary; }}
            onMouseLeave={(e) => { if (hasPrev) e.currentTarget.style.color = colors.text.secondary; }}
          >
            הקודם
            <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
