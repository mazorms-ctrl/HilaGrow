import { useState } from 'react';
import { format, isPast, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { AlertCircle, ChevronDown, ChevronUp, Eye, Lightbulb } from 'lucide-react';
import {
  useActiveLeafTasks,
  useIdeaLeafTasks,
  useTasksParticipants,
  useProfiles,
  type ActiveLeafTask,
  type IdeaLeafTask,
} from '@/lib/supabase-hooks';
import { QuickViewModalById } from '@/components/tasks/QuickViewModal';
import { colors, radius, shadows, spacing, typography } from '@/styles/tokens';
import type { TaskFilter } from './CommandCenter';

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const barColor =
    clamped >= 75
      ? colors.semantic.success
      : clamped >= 40
      ? colors.brand.primary
      : colors.semantic.warning;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, minWidth: 0 }}>
      <div
        style={{
          flex: 1,
          height: 6,
          borderRadius: radius.full,
          background: colors.border.light,
          overflow: 'hidden',
          minWidth: 60,
        }}
      >
        <div
          style={{
            width: `${clamped}%`,
            height: '100%',
            borderRadius: radius.full,
            background: barColor,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
      <span
        style={{
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.tertiary,
          flexShrink: 0,
          width: 30,
          textAlign: 'left',
        }}
      >
        {clamped}%
      </span>
    </div>
  );
}

// ── Due date cell ─────────────────────────────────────────────────────────────

function DueDate({ date }: { date: string | null }) {
  if (!date) {
    return (
      <span style={{ fontSize: typography.fontSize.xs, color: colors.text.disabled }}>—</span>
    );
  }

  const parsed = parseISO(date);
  const overdue = isPast(parsed);
  const label = format(parsed, 'd בMMM', { locale: he });

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: typography.fontSize.xs,
        fontWeight: overdue ? typography.fontWeight.bold : typography.fontWeight.normal,
        color: overdue ? colors.semantic.danger : colors.text.secondary,
        background: overdue ? colors.semantic.dangerLight : 'transparent',
        padding: overdue ? '2px 6px' : '0',
        borderRadius: overdue ? radius.sm : '0',
        whiteSpace: 'nowrap',
      }}
    >
      {overdue && <AlertCircle size={11} />}
      {label}
    </span>
  );
}

// ── Task name + parent breadcrumb + category in parens ────────────────────────

function TaskName({ task }: { task: ActiveLeafTask }) {
  return (
    <div style={{ minWidth: 0 }}>
      {task.parent_title && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            marginBottom: 2,
          }}
        >
          <span
            style={{
              fontSize: typography.fontSize.xs,
              color: colors.text.disabled,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {task.parent_title}
          </span>
        </div>
      )}
      <span
        style={{
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.medium,
          color: colors.text.primary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'block',
        }}
      >
        {task.title}
        {task.group_name && (
          <span
            style={{
              marginRight: 5,
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.normal,
              color: colors.text.tertiary,
            }}
          >
            ({task.group_name})
          </span>
        )}
      </span>
    </div>
  );
}

// ── Participants cell ─────────────────────────────────────────────────────────

interface ParticipantsProps {
  ownerName: string | null;
  assignedToId: string | null;
  participantIds: string[];
  profiles: { id: string; full_name: string | null; email: string | null }[];
}

function ParticipantsList({ ownerName, assignedToId, participantIds, profiles }: ParticipantsProps) {
  const resolvedNames: string[] = [];

  // Owner name (stored as text — no resolution needed)
  if (ownerName) resolvedNames.push(ownerName);

  // assigned_to profile (if different from owner_name)
  if (assignedToId) {
    const p = profiles.find((x) => x.id === assignedToId);
    const name = p?.full_name || p?.email || null;
    if (name && name !== ownerName) resolvedNames.push(name);
  }

  // Additional participants
  for (const pid of participantIds) {
    if (pid === assignedToId) continue; // already added above
    const p = profiles.find((x) => x.id === pid);
    const name = p?.full_name || p?.email || null;
    if (name && !resolvedNames.includes(name)) resolvedNames.push(name);
  }

  if (resolvedNames.length === 0) {
    return <span style={{ fontSize: typography.fontSize.xs, color: colors.text.disabled }}>—</span>;
  }

  const MAX = 3;
  const visible = resolvedNames.slice(0, MAX);
  const overflow = resolvedNames.length - MAX;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {visible.map((name, i) => (
        <span
          key={i}
          style={{
            fontSize: '11px',
            fontWeight: typography.fontWeight.medium,
            color: colors.text.secondary,
            background: colors.surface.hover,
            border: `1px solid ${colors.border.light}`,
            padding: '1px 6px',
            borderRadius: radius.full,
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </span>
      ))}
      {overflow > 0 && (
        <span
          style={{
            fontSize: '11px',
            color: colors.text.tertiary,
            padding: '1px 4px',
          }}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

// ── Eye / preview button ──────────────────────────────────────────────────────

function PreviewButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title="תצוגה מקדימה"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: radius.sm,
        border: 'none',
        cursor: 'pointer',
        background: hovered ? colors.brand.light : 'transparent',
        color: hovered ? colors.brand.primary : colors.text.tertiary,
        transition: 'background 0.15s, color 0.15s',
        margin: '0 auto',
      }}
    >
      <Eye size={14} />
    </button>
  );
}

// ── Column widths ─────────────────────────────────────────────────────────────

const COL_WIDTHS = {
  task:         '35%',
  participants: '25%',
  progress:     '22%',
  due:          '12%',
  preview:      '6%',
};

// ── Table row ─────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: ActiveLeafTask;
  participantIds: string[];
  profiles: { id: string; full_name: string | null; email: string | null }[];
  onPreview: (id: string) => void;
}

function TaskRow({ task, participantIds, profiles, onPreview }: TaskRowProps) {
  const overdue = task.due_date ? isPast(parseISO(task.due_date)) : false;
  return (
    <tr
      style={{
        borderBottom: `1px solid ${colors.border.light}`,
        background: overdue ? `${colors.semantic.dangerLight}44` : 'transparent',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = overdue
          ? `${colors.semantic.dangerLight}88`
          : colors.surface.hover;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = overdue
          ? `${colors.semantic.dangerLight}44`
          : 'transparent';
      }}
    >
      {/* Task name + category */}
      <td style={{ padding: `${spacing.md} ${spacing.lg}`, width: COL_WIDTHS.task }}>
        <TaskName task={task} />
      </td>

      {/* Participants */}
      <td style={{ padding: `${spacing.md} ${spacing.sm}`, width: COL_WIDTHS.participants }}>
        <ParticipantsList
          ownerName={task.owner_name}
          assignedToId={task.assigned_to}
          participantIds={participantIds}
          profiles={profiles}
        />
      </td>

      {/* Progress */}
      <td style={{ padding: `${spacing.md} ${spacing.sm}`, width: COL_WIDTHS.progress }}>
        <ProgressBar percent={task.status_percent} />
      </td>

      {/* Due date */}
      <td style={{ padding: `${spacing.md} ${spacing.sm}`, width: COL_WIDTHS.due }}>
        <DueDate date={task.due_date} />
      </td>

      {/* Preview eye */}
      <td style={{ padding: `${spacing.md} ${spacing.sm}`, width: COL_WIDTHS.preview, textAlign: 'center' }}>
        <PreviewButton onClick={() => onPreview(task.id)} />
      </td>
    </tr>
  );
}

// ── Table header ──────────────────────────────────────────────────────────────

function TableHead() {
  const th = (label: string, width: string, align: 'right' | 'left' | 'center' = 'right') => (
    <th
      style={{
        padding: `${spacing.sm} ${spacing.lg}`,
        width,
        textAlign: align,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.tertiary,
        background: colors.surface.hover,
        borderBottom: `1px solid ${colors.border.default}`,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </th>
  );

  return (
    <thead>
      <tr>
        {th('שם משימה',  COL_WIDTHS.task)}
        {th('משתתפים',   COL_WIDTHS.participants, 'right')}
        {th('התקדמות',   COL_WIDTHS.progress,     'right')}
        {th('יעד',       COL_WIDTHS.due,          'right')}
        {th('',          COL_WIDTHS.preview,      'center')}
      </tr>
    </thead>
  );
}

// ── Ideas table (compact) ─────────────────────────────────────────────────────

function IdeaTableHead() {
  const th = (label: string, width: string, align: 'right' | 'left' | 'center' = 'right') => (
    <th
      style={{
        padding: `${spacing.sm} ${spacing.lg}`,
        width,
        textAlign: align,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.tertiary,
        background: colors.surface.hover,
        borderBottom: `1px solid ${colors.border.default}`,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </th>
  );
  return (
    <thead>
      <tr>
        {th('שם משימה', '55%')}
        {th('קבוצה',    '28%', 'right')}
        {th('',         '17%', 'center')}
      </tr>
    </thead>
  );
}

function IdeaRowCompact({
  task,
  onPreview,
}: {
  task: IdeaLeafTask;
  onPreview: (id: string) => void;
}) {
  return (
    <tr
      style={{ borderBottom: `1px solid ${colors.border.light}`, background: 'transparent', transition: 'background 0.15s' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = colors.surface.hover; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <td style={{ padding: `${spacing.md} ${spacing.lg}`, width: '55%' }}>
        <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.secondary }}>
          {task.title}
        </span>
      </td>
      <td style={{ padding: `${spacing.md} ${spacing.sm}`, width: '28%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
          <span
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: task.group_color ?? colors.brand.primary,
              flexShrink: 0,
              boxShadow: `0 0 0 2px ${(task.group_color ?? colors.brand.primary)}33`,
            }}
          />
          <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, fontWeight: typography.fontWeight.medium }}>
            {task.group_name}
          </span>
        </div>
      </td>
      <td style={{ padding: `${spacing.md} ${spacing.sm}`, width: '17%', textAlign: 'center' }}>
        <PreviewButton onClick={() => onPreview(task.id)} />
      </td>
    </tr>
  );
}

// ── Collapsible section header ─────────────────────────────────────────────────

function SectionHeader({
  open, onToggle, children,
}: { open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onToggle}
      style={{
        padding: `${spacing.lg} ${spacing.xl}`,
        borderBottom: open ? `1px solid ${colors.border.light}` : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {children}
      <span style={{ color: colors.text.tertiary, flexShrink: 0, display: 'flex' }}>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </span>
    </div>
  );
}

// ── ProjectTaskList ───────────────────────────────────────────────────────────

interface ProjectTaskListProps {
  filter: TaskFilter;
}

export function ProjectTaskList({ filter }: ProjectTaskListProps) {
  const { data: tasks = [], isLoading }               = useActiveLeafTasks(100);
  const { data: ideas = [], isLoading: ideasLoading } = useIdeaLeafTasks(100);
  const { profiles }                                  = useProfiles();

  // Batch-fetch participants for all visible active tasks
  const allTaskIds = tasks.map((t) => t.id);
  const { data: participantsMap = new Map() }         = useTasksParticipants(allTaskIds);

  const [activeOpen, setActiveOpen] = useState(true);
  const [ideasOpen,  setIdeasOpen]  = useState(false);
  const [previewId,  setPreviewId]  = useState<string | null>(null);

  const visibleTasks = filter === 'overdue'
    ? tasks.filter((t) => t.due_date && isPast(parseISO(t.due_date)))
    : tasks;

  const overdueCount = tasks.filter((t) => t.due_date && isPast(parseISO(t.due_date))).length;
  const title        = filter === 'overdue' ? 'משימות באיחור' : 'משימות פעילות';
  const emptyMessage = filter === 'overdue' ? 'אין משימות באיחור' : 'אין משימות פעילות כרגע';
  const showIdeas    = filter === 'active';
  const borderColor  = filter === 'overdue' ? colors.semantic.danger : colors.border.light;

  return (
    <>
      {/* Quick view modal — rendered at top level to escape table stacking context */}
      <QuickViewModalById taskId={previewId} onClose={() => setPreviewId(null)} />

      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>

        {/* ── Active / Overdue section ── */}
        <div
          style={{
            background: colors.surface.elevated,
            borderRadius: radius.lg,
            border: `1px solid ${borderColor}`,
            boxShadow: shadows.md,
            overflow: 'hidden',
            transition: 'border-color 0.2s ease',
          }}
        >
          <SectionHeader open={activeOpen} onToggle={() => setActiveOpen((v) => !v)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <span style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                  {title}
                </span>
                {!isLoading && visibleTasks.length > 0 && (
                  <span
                    style={{
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.semibold,
                      color: filter === 'overdue' ? colors.semantic.danger : colors.text.tertiary,
                      background: filter === 'overdue' ? colors.semantic.dangerLight : colors.surface.hover,
                      border: `1px solid ${filter === 'overdue' ? colors.semantic.danger : colors.border.default}`,
                      padding: '1px 8px',
                      borderRadius: radius.full,
                    }}
                  >
                    {visibleTasks.length}
                  </span>
                )}
                {filter === 'active' && overdueCount > 0 && (
                  <span
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold,
                      color: colors.semantic.danger, background: colors.semantic.dangerLight,
                      padding: '1px 8px', borderRadius: radius.full,
                    }}
                  >
                    <AlertCircle size={11} />
                    {overdueCount} באיחור
                  </span>
                )}
              </div>
              {filter === 'active' && (
                <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
                  (משימות עם תאריך יעד או התקדמות בביצוע)
                </span>
              )}
            </div>
          </SectionHeader>

          {activeOpen && (
            <>
              {isLoading && (
                <div style={{ padding: `${spacing.xxxxl} 0`, textAlign: 'center', color: colors.text.tertiary, fontSize: typography.fontSize.sm }}>
                  טוען משימות…
                </div>
              )}
              {!isLoading && visibleTasks.length === 0 && (
                <div style={{ padding: `${spacing.xxxxl} 0`, textAlign: 'center', color: colors.text.tertiary, fontSize: typography.fontSize.sm }}>
                  {emptyMessage}
                </div>
              )}
              {!isLoading && visibleTasks.length > 0 && (
  <>
    {/* Desktop: table */}
    <div className="ptl-table-wrap" style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520, fontFamily: typography.fontFamily }}>
        <TableHead />
        <tbody>
          {visibleTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              participantIds={participantsMap.get(task.id) ?? []}
              profiles={profiles}
              onPreview={setPreviewId}
            />
          ))}
        </tbody>
      </table>
    </div>

    {/* Mobile: cards */}
    <div className="ptl-card-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 12px 12px' }}>
      {visibleTasks.map((task) => {
        const overdue = task.due_date ? isPast(parseISO(task.due_date)) : false;
        const pIds = participantsMap.get(task.id) ?? [];
        const names: string[] = [];
        if (task.owner_name) names.push(task.owner_name);
        if (task.assigned_to) {
          const p = profiles.find(x => x.id === task.assigned_to);
          const n = p?.full_name || p?.email || null;
          if (n && n !== task.owner_name) names.push(n);
        }
        for (const pid of pIds.slice(0, 2)) {
          const p = profiles.find(x => x.id === pid);
          const n = p?.full_name || p?.email || null;
          if (n && !names.includes(n)) names.push(n);
        }
        const clamped = Math.max(0, Math.min(100, task.status_percent));
        const barColor = clamped >= 75 ? colors.semantic.success : clamped >= 40 ? colors.brand.primary : colors.semantic.warning;

        return (
          <button
            key={task.id}
            onClick={() => setPreviewId(task.id)}
            style={{
              width: '100%', textAlign: 'right', cursor: 'pointer',
              padding: '14px 14px 12px',
              borderRadius: 14,
              background: overdue ? `${colors.semantic.dangerLight}66` : colors.surface.elevated,
              boxShadow: '0 2px 10px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)',
              border: `1px solid ${overdue ? colors.semantic.danger + '44' : colors.border.light}`,
              fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', gap: 8,
              WebkitTapHighlightColor: 'transparent',
            } as React.CSSProperties}
          >
            {/* Title row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                {task.parent_title && (
                  <div style={{ fontSize: 11, color: colors.text.disabled, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.parent_title}
                  </div>
                )}
                <div style={{ fontSize: 14, fontWeight: 600, color: colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.title}
                  {task.group_name && (
                    <span style={{ marginRight: 5, fontSize: 11, fontWeight: 400, color: colors.text.tertiary }}>
                      ({task.group_name})
                    </span>
                  )}
                </div>
              </div>
              {overdue && (
                <span style={{ fontSize: 10, fontWeight: 700, color: colors.semantic.danger, background: colors.semantic.dangerLight, padding: '2px 7px', borderRadius: 20, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  באיחור
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 5, borderRadius: 99, background: colors.border.light, overflow: 'hidden' }}>
                <div style={{ width: `${clamped}%`, height: '100%', borderRadius: 99, background: barColor, transition: 'width 0.4s ease' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: colors.text.tertiary, flexShrink: 0, width: 28, textAlign: 'left' }}>
                {clamped}%
              </span>
            </div>

            {/* Meta row: due date + participants */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', overflow: 'hidden' }}>
                {names.slice(0, 2).map((n, i) => (
                  <span key={i} style={{ fontSize: 10, fontWeight: 500, color: colors.text.secondary, background: colors.surface.hover, border: `1px solid ${colors.border.light}`, padding: '1px 6px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                    {n}
                  </span>
                ))}
                {names.length > 2 && <span style={{ fontSize: 10, color: colors.text.tertiary }}>+{names.length - 2}</span>}
              </div>
              {task.due_date && (
                <span style={{ fontSize: 11, color: overdue ? colors.semantic.danger : colors.text.secondary, fontWeight: overdue ? 700 : 400, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {(() => { try { return format(parseISO(task.due_date), 'd בMMM', { locale: he }); } catch { return ''; } })()}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
    <style>{`
      @media (min-width: 768px) { .ptl-card-list { display: none !important; } }
      @media (max-width: 767px) { .ptl-table-wrap { display: none !important; } }
    `}</style>
  </>
)}
            </>
          )}
        </div>

        {/* ── Ideas / Inactive section ── */}
        {showIdeas && (
          <div
            style={{
              background: colors.surface.elevated,
              borderRadius: radius.lg,
              border: `1px solid ${colors.border.light}`,
              boxShadow: shadows.sm,
              overflow: 'hidden',
            }}
          >
            <SectionHeader open={ideasOpen} onToggle={() => setIdeasOpen((v) => !v)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <Lightbulb size={15} color={colors.text.tertiary} />
                <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                  משימות לא פעילות / רעיונות
                </span>
                {!ideasLoading && ideas.length > 0 && (
                  <span
                    style={{
                      fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold,
                      color: colors.text.tertiary, background: colors.surface.hover,
                      border: `1px solid ${colors.border.default}`,
                      padding: '1px 8px', borderRadius: radius.full,
                    }}
                  >
                    {ideas.length}
                  </span>
                )}
                <span style={{ fontSize: typography.fontSize.xs, color: colors.text.disabled }}>
                  (0% התקדמות, ללא תאריך יעד)
                </span>
              </div>
            </SectionHeader>

            {ideasOpen && (
              <>
                {ideasLoading && (
                  <div style={{ padding: `${spacing.xxxxl} 0`, textAlign: 'center', color: colors.text.tertiary, fontSize: typography.fontSize.sm }}>
                    טוען…
                  </div>
                )}
                {!ideasLoading && ideas.length === 0 && (
                  <div style={{ padding: `${spacing.xxxxl} 0`, textAlign: 'center', color: colors.text.tertiary, fontSize: typography.fontSize.sm }}>
                    אין משימות לא פעילות
                  </div>
                )}
                {!ideasLoading && ideas.length > 0 && (
  <>
    <div className="ptl-table-wrap" style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400, fontFamily: typography.fontFamily }}>
        <IdeaTableHead />
        <tbody>
          {ideas.map((idea) => (
            <IdeaRowCompact
              key={idea.id}
              task={idea}
              onPreview={setPreviewId}
            />
          ))}
        </tbody>
      </table>
    </div>
    <div className="ptl-card-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 12px 12px' }}>
      {ideas.map((idea) => (
        <button
          key={idea.id}
          onClick={() => setPreviewId(idea.id)}
          style={{
            width: '100%', textAlign: 'right', cursor: 'pointer',
            padding: '14px',
            borderRadius: 14,
            background: colors.surface.elevated,
            boxShadow: '0 2px 10px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)',
            border: `1px solid ${colors.border.light}`,
            fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            WebkitTapHighlightColor: 'transparent',
          } as React.CSSProperties}
        >
          <span style={{ fontSize: 13, fontWeight: 500, color: colors.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {idea.title}
          </span>
          {idea.group_name && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: idea.group_color ?? colors.brand.primary, boxShadow: `0 0 0 2px ${(idea.group_color ?? colors.brand.primary)}33`, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: colors.text.secondary }}>{idea.group_name}</span>
            </span>
          )}
        </button>
      ))}
    </div>
  </>
)}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
