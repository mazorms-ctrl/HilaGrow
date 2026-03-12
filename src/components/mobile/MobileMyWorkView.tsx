import { CheckSquare, Target, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMyLeadInitiatives, useMyAssignedMilestones, type InitiativeSummary, type AssignedMilestone } from '@/lib/supabase-hooks';

const T = {
  bg:           '#f8fafc',
  card:         '#ffffff',
  border:       'rgba(0,0,0,0.06)',
  cardShadow:   '0 2px 10px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)',
  title:        '#1e293b',
  sub:          '#64748b',
  dim:          '#cbd5e1',
  blue:         '#2563eb',
  blueSoft:     'rgba(37,99,235,0.07)',
  teal:         '#0d9488',
  tealSoft:     'rgba(13,148,136,0.07)',
  danger:       '#ef4444',
  dangerSoft:   'rgba(239,68,68,0.06)',
  success:      '#10b981',
};

function fmtDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
}
function isOverdue(due: string | null) {
  return due ? new Date(due) < new Date() : false;
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0' }}>
      <div style={{
        width: 20, height: 20,
        border: `2px solid ${T.border}`, borderTopColor: T.blue,
        borderRadius: '50%', animation: 'mw-spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes mw-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function SectionLabel({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '14px 16px 8px',
    }}>
      <span style={{ color: T.dim, display: 'flex' }}>{icon}</span>
      <span style={{
        fontSize: 11, fontWeight: 400, color: T.dim,
        textTransform: 'uppercase', letterSpacing: '1.6px', flex: 1,
      }}>
        {label}
      </span>
      {count > 0 && (
        <span style={{
          fontSize: 11, color: T.sub,
          background: 'rgba(0,0,0,0.055)',
          padding: '2px 9px', borderRadius: 20,
        }}>
          {count}
        </span>
      )}
    </div>
  );
}

function StatusBadge({ overdue, done }: { overdue: boolean; done: boolean }) {
  if (done)    return <span style={{ fontSize: 10, fontWeight: 600, color: T.success, background: 'rgba(16,185,129,0.1)', padding: '2px 7px', borderRadius: 20, flexShrink: 0 }}>הושלם</span>;
  if (overdue) return <span style={{ fontSize: 10, fontWeight: 600, color: T.danger,  background: 'rgba(239,68,68,0.1)',  padding: '2px 7px', borderRadius: 20, flexShrink: 0 }}>באיחור</span>;
  return             <span style={{ fontSize: 10, fontWeight: 600, color: T.blue,    background: 'rgba(37,99,235,0.08)', padding: '2px 7px', borderRadius: 20, flexShrink: 0 }}>פעיל</span>;
}

function InitiativeCard({ initiative, onClick }: { initiative: InitiativeSummary; onClick: () => void }) {
  const overdue = isOverdue(initiative.dueDate) && initiative.progress < 100;
  const done    = initiative.progress === 100;
  const accent  = overdue ? T.danger : T.blue;

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'right', cursor: 'pointer',
        padding: '10px 12px 10px 10px',
        borderRadius: 12,
        background: T.card,
        boxShadow: T.cardShadow,
        borderTop:    '1px solid rgba(0,0,0,0.04)',
        borderBottom: '1px solid rgba(0,0,0,0.04)',
        borderLeft:   '1px solid rgba(0,0,0,0.04)',
        borderRight:  `3px solid ${accent}`,
        fontFamily: 'inherit',
        minHeight: 52,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4,
        WebkitTapHighlightColor: 'transparent',
        transition: 'background 0.12s',
      }}
      onTouchStart={e => { (e.currentTarget as HTMLElement).style.background = overdue ? T.dangerSoft : T.blueSoft; }}
      onTouchEnd={e   => { (e.currentTarget as HTMLElement).style.background = T.card; }}
    >
      {/* Title row with status badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, direction: 'rtl' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: T.title, lineHeight: 1.3, flex: 1, textAlign: 'right' }}>
          {initiative.title}
        </span>
        <StatusBadge overdue={overdue} done={done} />
      </div>
      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, direction: 'rtl' }}>
        {initiative.milestoneCount > 0 && (
          <span style={{ fontSize: 11, color: done ? T.success : T.sub }}>
            {initiative.milestoneDone}/{initiative.milestoneCount} אבני דרך
          </span>
        )}
        {initiative.dueDate && (
          <>
            {initiative.milestoneCount > 0 && <span style={{ fontSize: 10, color: T.dim }}>·</span>}
            <span style={{ fontSize: 11, color: overdue ? T.danger : T.sub }}>
              {fmtDate(initiative.dueDate)}
            </span>
          </>
        )}
      </div>
    </button>
  );
}

function MilestoneCard({ milestone, onClick }: { milestone: AssignedMilestone; onClick: () => void }) {
  const overdue = isOverdue(milestone.dueDate);
  const accent  = overdue ? T.danger : T.teal;

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'right', cursor: 'pointer',
        padding: '10px 12px 10px 10px',
        borderRadius: 12,
        background: T.card,
        boxShadow: T.cardShadow,
        borderTop:    '1px solid rgba(0,0,0,0.04)',
        borderBottom: '1px solid rgba(0,0,0,0.04)',
        borderLeft:   '1px solid rgba(0,0,0,0.04)',
        borderRight:  `3px solid ${accent}`,
        fontFamily: 'inherit',
        minHeight: 48,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4,
        WebkitTapHighlightColor: 'transparent',
        transition: 'background 0.12s',
      }}
      onTouchStart={e => { (e.currentTarget as HTMLElement).style.background = overdue ? T.dangerSoft : T.tealSoft; }}
      onTouchEnd={e   => { (e.currentTarget as HTMLElement).style.background = T.card; }}
    >
      {/* Title row with status badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, direction: 'rtl' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: T.title, lineHeight: 1.3, flex: 1, textAlign: 'right' }}>
          {milestone.title}
        </span>
        <StatusBadge overdue={overdue} done={false} />
      </div>
      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, direction: 'rtl' }}>
        {milestone.taskTitle && (
          <span style={{ fontSize: 11, color: T.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'right' }}>
            {milestone.taskTitle}
          </span>
        )}
        {milestone.taskTitle && <span style={{ fontSize: 10, color: T.dim }}>·</span>}
        <span style={{ fontSize: 11, color: overdue ? T.danger : (milestone.dueDate ? T.sub : T.dim), flexShrink: 0 }}>
          {milestone.dueDate ? fmtDate(milestone.dueDate) : 'ללא תאריך'}
        </span>
      </div>
    </button>
  );
}

interface Props { onClose: () => void }

export function MobileMyWorkView({ onClose }: Props) {
  const navigate = useNavigate();
  const { initiatives, loading: initLoading }         = useMyLeadInitiatives();
  const { milestones: myMilestones, loading: milLoad } = useMyAssignedMilestones();

  function go(path: string) { onClose(); navigate(path); }

  return (
    <div
      dir="rtl"
      className="flex md:hidden"
      style={{
        position: 'fixed', inset: 0, zIndex: 35,
        background: T.bg,
        flexDirection: 'column',
        fontFamily: 'Rubik, Heebo, sans-serif',
        paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 16px 12px',
        borderBottom: `1px solid ${T.border}`,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        flexShrink: 0,
      }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.title, letterSpacing: '-0.3px' }}>
          משימות
        </h2>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(0,0,0,0.05)', border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <X size={18} color={T.sub} />
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>

        {/* Initiatives */}
        <SectionLabel icon={<Target size={12} />} label="פרויקטים באחריותי" count={initiatives.length} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 12px 8px' }}>
          {initLoading
            ? <Spinner />
            : initiatives.length === 0
              ? <p style={{ fontSize: 13, color: T.dim, textAlign: 'right', padding: '4px 4px 12px' }}>אין פרויקטים בניהולך</p>
              : initiatives.map(i => (
                <InitiativeCard key={i.id} initiative={i} onClick={() => go(`/task/${i.id}`)} />
              ))
          }
        </div>

        <div style={{ height: 1, background: T.border, margin: '4px 16px' }} />

        {/* Milestones */}
        <SectionLabel icon={<CheckSquare size={12} />} label="אחראי על אבני דרך" count={myMilestones.length} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 12px 24px' }}>
          {milLoad
            ? <Spinner />
            : myMilestones.length === 0
              ? <p style={{ fontSize: 13, color: T.dim, textAlign: 'right', padding: '4px 4px 12px' }}>אין אבני דרך באחריותך</p>
              : myMilestones.map(m => (
                <MilestoneCard key={m.id} milestone={m} onClick={() => go(`/task/${m.taskId}`)} />
              ))
          }
        </div>

      </div>
    </div>
  );
}
