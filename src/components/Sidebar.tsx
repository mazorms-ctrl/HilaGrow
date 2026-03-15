import { LogOut, ChevronRight, AlertCircle, Target, CheckSquare, ShieldAlert, UserCog, DatabaseBackup, FileSpreadsheet, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useMyLeadInitiatives,
  useMyAssignedMilestones,
  type InitiativeSummary,
  type AssignedMilestone,
} from '@/lib/supabase-hooks';
// QuickViewModalById intentionally removed — sidebar is now a pure navigation hub
import { useState } from 'react';
import { generateMasterBackup, downloadBackupAsJson, exportMasterBackupAsCsv, exportMasterBackupAsPdf } from '@/services/backupService';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/contexts/AuthContext';

// ── Premium Medical tokens ────────────────────────────────────────────────────
const T = {
  bg:           '#ffffff',
  card:         '#ffffff',
  surfaceHover: '#f8fafc',
  border:       'rgba(0,0,0,0.06)',
  cardShadow:   '0 2px 10px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03)',
  cardShadowHover: '0 4px 16px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)',
  // Text
  title:        '#334155',   // slate-700 — clean, not harsh
  textSub:      '#94a3b8',   // slate-400
  textDim:      '#cbd5e1',   // slate-300
  // Accent border colours (4px right-side rule)
  blue:         '#2563eb',   // in-progress
  success:      '#10b981',   // completed
  danger:       '#ef4444',   // overdue
  grey:         '#cbd5e1',   // not started
  // Hover fills (very subtle)
  blueSoft:     'rgba(37,99,235,0.07)',
  dangerSoft:   'rgba(239,68,68,0.06)',
  // Collapsed dot fills
  blueMid:      'rgba(37,99,235,0.13)',
  teal:         '#0d9488',
  tealSoft:     'rgba(13,148,136,0.07)',
  tealMid:      'rgba(13,148,136,0.13)',
  dangerMid:    'rgba(239,68,68,0.13)',
};

interface Props {
  user: User;
  profile: Profile | null;
  isAdmin?: boolean;
  onSignOut: () => void;
  onEditProfile: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function isOverdue(due: string | null) {
  return due ? new Date(due) < new Date() : false;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
}

// ── Section header — uppercase label, count badge ─────────────────────────────
function SectionHeader({
  icon, label, count,
}: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '14px 16px 5px',
    }}>
      <span style={{ color: T.textDim, display: 'flex', flexShrink: 0 }}>{icon}</span>
      <span style={{
        fontSize: '9px',
        fontWeight: 300,
        color: T.textDim,
        textTransform: 'uppercase',
        letterSpacing: '1.6px',
        flex: 1,
      }}>
        {label}
      </span>
      {count > 0 && (
        <span style={{
          fontSize: '10px',
          fontWeight: 300,
          color: T.textSub,
          background: 'rgba(0,0,0,0.055)',
          padding: '1px 7px',
          borderRadius: '20px',
        }}>
          {count}
        </span>
      )}
    </div>
  );
}

// ── Initiative Card — white, right-accent border, metadata row ───────────────
function InitiativeCard({
  initiative, onClick,
}: { initiative: InitiativeSummary; onClick: () => void }) {
  const pct      = initiative.progress;
  const overdue  = isOverdue(initiative.dueDate) && pct < 100;
  const done     = pct === 100;

  const accentColor = overdue ? T.danger : T.blue;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      style={{
        padding: '9px 12px 9px 10px',
        borderRadius: '10px',
        background: T.card,
        boxShadow: T.cardShadow,
        // Accent: 3px right border, hairline on other three sides
        borderTop:    '1px solid rgba(0,0,0,0.04)',
        borderBottom: '1px solid rgba(0,0,0,0.04)',
        borderLeft:   '1px solid rgba(0,0,0,0.04)',
        borderRight:  `3px solid ${accentColor}`,
        cursor: 'pointer',
        textAlign: 'right',
        fontFamily: 'inherit',
        transition: 'box-shadow 0.15s, background 0.13s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = T.cardShadowHover;
        e.currentTarget.style.background = overdue ? T.dangerSoft : T.surfaceHover;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = T.cardShadow;
        e.currentTarget.style.background = T.card;
      }}
    >
      {/* Title */}
      <div style={{
        fontSize: '12.5px',
        fontWeight: 400,
        color: T.title,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        lineHeight: 1.45,
        direction: 'rtl',
        marginBottom: '4px',
      }}>
        {initiative.title}
      </div>

      {/* Metadata row: milestones progress · date · פג תוקף */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        direction: 'rtl', flexWrap: 'nowrap',
      }}>
        {initiative.milestoneCount > 0 && (
          <span style={{ fontSize: '10px', fontWeight: 300, color: done ? T.success : T.textSub, flexShrink: 0 }}>
            {initiative.milestoneDone}/{initiative.milestoneCount} אבני דרך
          </span>
        )}
        {initiative.dueDate && (
          <>
            {initiative.milestoneCount > 0 && <span style={{ fontSize: '9px', color: T.textDim }}>·</span>}
            <span style={{ fontSize: '10px', fontWeight: 300, color: overdue ? T.danger : T.textSub, flexShrink: 0 }}>
              {fmtDate(initiative.dueDate)}
            </span>
          </>
        )}
        {overdue && (
          <span style={{ fontSize: '9px', fontWeight: 300, color: T.danger, flexShrink: 0 }}>
            · פג תוקף
          </span>
        )}
      </div>
    </div>
  );
}

// ── Assigned Milestone Card ───────────────────────────────────────────────────
function AssignedMilestoneRow({
  milestone, onClick,
}: { milestone: AssignedMilestone; onClick: () => void }) {
  const overdue     = isOverdue(milestone.dueDate);
  const accentColor = overdue ? T.danger : T.teal;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      style={{
        padding: '8px 12px 8px 10px',
        borderRadius: '10px',
        background: T.card,
        boxShadow: T.cardShadow,
        borderTop:    '1px solid rgba(0,0,0,0.04)',
        borderBottom: '1px solid rgba(0,0,0,0.04)',
        borderLeft:   '1px solid rgba(0,0,0,0.04)',
        borderRight:  `3px solid ${accentColor}`,
        cursor: 'pointer',
        direction: 'rtl',
        fontFamily: 'inherit',
        transition: 'box-shadow 0.15s, background 0.13s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = T.cardShadowHover;
        e.currentTarget.style.background = overdue ? T.dangerSoft : T.tealSoft;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = T.cardShadow;
        e.currentTarget.style.background = T.card;
      }}
    >
      <div style={{
        fontSize: '12px', fontWeight: 400, color: T.title,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        lineHeight: 1.45,
        marginBottom: '3px',
      }}>
        {milestone.title}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', direction: 'rtl', flexWrap: 'nowrap' }}>
        {milestone.taskTitle && (
          <span style={{ fontSize: '10px', fontWeight: 300, color: T.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {milestone.taskTitle}
          </span>
        )}
        {milestone.taskTitle && <span style={{ fontSize: '9px', color: T.textDim }}>·</span>}
        <span style={{ fontSize: '10px', fontWeight: 300, color: overdue ? T.danger : (milestone.dueDate ? T.textSub : T.textDim), flexShrink: 0 }}>
          {milestone.dueDate ? fmtDate(milestone.dueDate) : 'ללא תאריך יעד'}
        </span>
        {overdue && (
          <span style={{ fontSize: '9px', fontWeight: 300, color: T.danger, flexShrink: 0 }}>
            · פג תוקף
            </span>
          )}
        </div>
    </div>
  );
}

function SectionDivider() {
  return <div style={{ height: '1px', background: T.border, margin: '6px 16px 0' }} />;
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0' }}>
      <div style={{
        width: '15px', height: '15px',
        border: `2px solid ${T.border}`, borderTopColor: T.blue,
        borderRadius: '50%', animation: 'sb-spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes sb-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function EmptyNote({ message }: { message: string }) {
  return (
    <p style={{
      fontSize: '11px', fontWeight: 300,
      color: T.textDim, textAlign: 'right',
      margin: '4px 0 10px', padding: '0 14px', lineHeight: 1.6,
    }}>
      {message}
    </p>
  );
}

function CollapsedDot({
  title, bg, border, children, onClick,
}: { title: string; bg: string; border: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: '34px', height: '34px', borderRadius: '8px',
        background: bg, border: `1px solid ${border}`,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'filter 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(0.92)'; }}
      onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
    >
      {children}
    </button>
  );
}

// ── Main Sidebar ───────────────────────────────────────────────────────────────
export function Sidebar({ user, profile, isAdmin = false, onSignOut, onEditProfile, collapsed, onToggleCollapse }: Props) {
  const { initiatives, loading: initLoading } = useMyLeadInitiatives();
  const { milestones: myMilestones, loading: milestonesLoading } = useMyAssignedMilestones();
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  async function handleEmergencyBackup() {
    if (backupLoading) return;
    setExportMenuOpen(false);
    setBackupLoading(true);
    try {
      const backup = await generateMasterBackup(user.id);
      downloadBackupAsJson(backup);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Emergency Backup] failed:', msg, err);
      alert(`גיבוי נכשל:\n${msg}`);
    } finally {
      setBackupLoading(false);
    }
  }

  async function handleCsvExport() {
    if (backupLoading) return;
    setExportMenuOpen(false);
    setBackupLoading(true);
    try {
      await exportMasterBackupAsCsv(user.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[CSV Export] failed:', msg, err);
      alert(`ייצוא נכשל:\n${msg}`);
    } finally {
      setBackupLoading(false);
    }
  }

  async function handlePdfExport() {
    if (backupLoading) return;
    setExportMenuOpen(false);
    setBackupLoading(true);
    try {
      await exportMasterBackupAsPdf(user.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[PDF Export] failed:', msg, err);
      alert(`הפקת דוח נכשלה:\n${msg}`);
    } finally {
      setBackupLoading(false);
    }
  }
  const initials = (profile?.full_name || user.email || '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const w = collapsed ? '58px' : 'clamp(232px, 18vw, 300px)';

  return (
    <aside
      dir="rtl"
      style={{
        width: w, minWidth: w, maxWidth: w,
        background: T.bg,
        color: T.title,
        display: 'flex', flexDirection: 'column',
        borderLeft: `1px solid ${T.border}`,
        boxShadow: '-2px 0 12px rgba(0,0,0,0.04)',
        transition: 'width 0.25s cubic-bezier(.4,0,.2,1), min-width 0.25s cubic-bezier(.4,0,.2,1)',
        overflow: 'hidden', flexShrink: 0,
      }}
    >
      {/* ── Profile card ─────────────────────────────────────── */}
      <div
        onClick={() => setProfileDropdownOpen(v => !v)}
        style={{
          background: profileDropdownOpen ? 'rgba(0,0,0,0.025)' : 'transparent',
          padding: collapsed ? '14px 0' : '13px 14px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex',
          flexDirection: collapsed ? 'column' : 'row',
          alignItems: 'center',
          gap: collapsed ? '0' : '10px',
          flexShrink: 0, cursor: 'pointer',
          transition: 'background 0.15s',
        }}
      >
        <div style={{
          width: '34px', height: '34px', minWidth: '34px',
          borderRadius: '9px',
          background: 'linear-gradient(135deg, #2563eb 0%, #6366f1 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 400, color: '#fff',
          flexShrink: 0,
          boxShadow: '0 1px 6px rgba(37,99,235,0.25)',
        }}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '9px' }} />
            : initials
          }
        </div>

        {!collapsed && (
          <div style={{ overflow: 'hidden', flex: 1, minWidth: 0, direction: 'rtl' }}>
            <div style={{
              fontSize: '12.5px', fontWeight: 300, color: T.title,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {profile?.full_name || user.email || ''}
            </div>
            {profile?.full_name && (
              <div style={{
                fontSize: '10px', fontWeight: 300, color: T.textSub,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                marginTop: '2px',
              }}>
                {user.email}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Profile dropdown ──────────────────────────────────── */}
      {profileDropdownOpen && !collapsed && (
        <div style={{ borderBottom: `1px solid ${T.border}`, background: 'rgba(0,0,0,0.015)', flexShrink: 0 }}>
          <div style={{ padding: '8px 14px 3px', fontSize: '10.5px', fontWeight: 300, color: T.textSub, textAlign: 'right' }}>
            {user.email}
          </div>
          <button
            onClick={e => { e.stopPropagation(); onEditProfile(); setProfileDropdownOpen(false); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '7px',
              padding: '9px 14px', background: 'none', border: 'none',
              cursor: 'pointer', fontSize: '12px', fontWeight: 300,
              color: T.title, fontFamily: 'inherit', textAlign: 'right',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.surfaceHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            <UserCog size={12} />
            עריכת פרופיל
          </button>
          <button
            onClick={e => { e.stopPropagation(); onSignOut(); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '7px',
              padding: '9px 14px', background: 'none', border: 'none',
              cursor: 'pointer', fontSize: '12px', fontWeight: 300,
              color: T.danger, fontFamily: 'inherit', textAlign: 'right',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.dangerSoft; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            <LogOut size={12} />
            יציאה
          </button>
        </div>
      )}

      {/* ── Export dropdown — always visible below email ── */}
      {!collapsed && (
        <div style={{ position: 'relative', flexShrink: 0, borderBottom: `1px solid ${T.border}` }}>
          {/* Toggle button */}
          <button
            onClick={() => { if (!backupLoading) setExportMenuOpen(v => !v); }}
            disabled={backupLoading}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '7px',
              padding: '7px 16px',
              background: exportMenuOpen ? 'rgba(217,119,6,0.06)' : 'none',
              border: 'none',
              cursor: backupLoading ? 'default' : 'pointer',
              fontSize: '11.5px', fontWeight: 300,
              color: backupLoading ? T.textDim : '#d97706',
              fontFamily: 'inherit', direction: 'rtl',
              transition: 'background 0.1s, color 0.1s',
              opacity: backupLoading ? 0.6 : 1,
            }}
            onMouseEnter={e => { if (!backupLoading && !exportMenuOpen) { e.currentTarget.style.background = 'rgba(217,119,6,0.06)'; e.currentTarget.style.color = '#b45309'; } }}
            onMouseLeave={e => { if (!exportMenuOpen) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = backupLoading ? T.textDim : '#d97706'; } }}
          >
            <DatabaseBackup size={11} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, textAlign: 'right' }}>{backupLoading ? 'מעבד...' : 'גיבוי וייצוא'}</span>
            <ChevronRight
              size={10}
              style={{
                flexShrink: 0, color: T.textDim,
                transform: exportMenuOpen ? 'rotate(270deg)' : 'rotate(90deg)',
                transition: 'transform 0.2s',
              }}
            />
          </button>

          {/* Dropdown menu */}
          {exportMenuOpen && (
            <>
              {/* Click-away backdrop */}
              <div
                onClick={() => setExportMenuOpen(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 99 }}
              />
              <div style={{
                position: 'absolute', top: '100%', right: 0, left: 0,
                background: '#fff',
                border: `1px solid ${T.border}`,
                borderRadius: '0 0 8px 8px',
                boxShadow: '0 6px 20px rgba(0,0,0,0.10)',
                zIndex: 100,
                overflow: 'hidden',
              }}>
                <button
                  onClick={handleEmergencyBackup}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '9px 16px', background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: '11.5px', fontWeight: 300,
                    color: T.title, fontFamily: 'inherit', direction: 'rtl',
                    transition: 'background 0.1s',
                    borderBottom: `1px solid ${T.border}`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.surfaceHover; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                >
                  <DatabaseBackup size={11} style={{ color: '#d97706', flexShrink: 0 }} />
                  <div style={{ textAlign: 'right' }}>
                    <div>גיבוי מערכת (JSON)</div>
                    <div style={{ fontSize: '9.5px', color: T.textSub, marginTop: '1px' }}>לשחזור טכני מלא</div>
                  </div>
                </button>
                <button
                  onClick={handleCsvExport}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '9px 16px', background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: '11.5px', fontWeight: 300,
                    color: T.title, fontFamily: 'inherit', direction: 'rtl',
                    transition: 'background 0.1s',
                    borderBottom: `1px solid ${T.border}`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.surfaceHover; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                >
                  <FileSpreadsheet size={11} style={{ color: '#16a34a', flexShrink: 0 }} />
                  <div style={{ textAlign: 'right' }}>
                    <div>ייצוא לאקסל (CSV)</div>
                    <div style={{ fontSize: '9.5px', color: T.textSub, marginTop: '1px' }}>לקריאה וניתוח נתונים</div>
                  </div>
                </button>
                <button
                  onClick={handlePdfExport}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '9px 16px', background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: '11.5px', fontWeight: 300,
                    color: T.title, fontFamily: 'inherit', direction: 'rtl',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.surfaceHover; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                >
                  <FileText size={11} style={{ color: '#dc2626', flexShrink: 0 }} />
                  <div style={{ textAlign: 'right' }}>
                    <div>הפקת דוח PDF</div>
                    <div style={{ fontSize: '9.5px', color: T.textSub, marginTop: '1px' }}>דוח מודפס — הילל יפה</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Scrollable body ───────────────────────────────────── */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.07) transparent',
      }}>
        <style>{`
          aside::-webkit-scrollbar { width: 3px; }
          aside::-webkit-scrollbar-track { background: transparent; }
          aside::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 3px; }
        `}</style>

        {collapsed ? (
          <div style={{
            display: 'flex', flexDirection: 'column',
            gap: '5px', alignItems: 'center', padding: '10px 0',
          }}>
            {initiatives.map(i => (
              <CollapsedDot
                key={i.id} title={i.title}
                bg={T.blueSoft} border={T.blueMid}
                onClick={() => navigate(`/task/${i.id}`)}
              >
                <Target size={13} style={{ color: T.blue }} />
              </CollapsedDot>
            ))}
            {initiatives.length > 0 && myMilestones.length > 0 && (
              <div style={{ width: '24px', borderTop: `1px solid ${T.border}`, margin: '2px 0' }} />
            )}
            {myMilestones.map(m => {
              const ov = isOverdue(m.dueDate);
              return (
                <CollapsedDot
                  key={m.id} title={m.title}
                  bg={ov ? T.dangerSoft : T.tealSoft}
                  border={ov ? T.dangerMid : T.tealMid}
                  onClick={() => navigate(`/task/${m.taskId}`)}
                >
                  {ov
                    ? <AlertCircle size={12} style={{ color: T.danger }} />
                    : <CheckSquare size={12} style={{ color: T.teal }} />
                  }
                </CollapsedDot>
              );
            })}
          </div>

        ) : (
          <>
            {/* ── Section 1: Initiatives I lead ── */}
            <SectionHeader
              icon={<Target size={10} />}
              label="פרויקטים באחריותי"
              count={initiatives.length}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px 10px 10px' }}>
              {initLoading
                ? <Spinner />
                : initiatives.length === 0
                  ? <EmptyNote message="אין פרויקטים בניהולך" />
                  : initiatives.map(i => (
                    <InitiativeCard key={i.id} initiative={i} onClick={() => navigate(`/task/${i.id}`)} />
                  ))
              }
            </div>

            <SectionDivider />

            {/* ── Section 2: Milestones assigned to me ── */}
            <SectionHeader
              icon={<CheckSquare size={10} />}
              label="אחראי על אבני דרך"
              count={myMilestones.length}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px 10px 16px' }}>
              {milestonesLoading
                ? <Spinner />
                : myMilestones.length === 0
                  ? <EmptyNote message="אין אבני דרך באחריותך" />
                  : myMilestones.map(m => (
                    <AssignedMilestoneRow
                      key={m.id}
                      milestone={m}
                      onClick={() => navigate(`/task/${m.taskId}`)}
                    />
                  ))
              }
            </div>
          </>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <div style={{
        borderTop: `1px solid ${T.border}`,
        padding: collapsed ? '8px 0' : '6px 8px',
        display: 'flex', flexDirection: 'column', gap: '1px', flexShrink: 0,
      }}>
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'הרחב תפריט' : 'כווץ תפריט'}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
            padding: collapsed ? '8px 0' : '7px 8px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: 'transparent', color: T.textDim, border: 'none',
            borderRadius: '6px', cursor: 'pointer',
            fontSize: '11.5px', fontWeight: 300,
            fontFamily: 'inherit', transition: 'background 0.14s, color 0.14s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = T.surfaceHover; e.currentTarget.style.color = T.textSub; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textDim; }}
        >
          <ChevronRight
            size={14}
            style={{
              flexShrink: 0,
              transform: collapsed ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)',
            }}
          />
          {!collapsed && <span>כווץ תפריט</span>}
        </button>

        {isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            title="ניהול מערכת"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
              padding: collapsed ? '8px 0' : '7px 8px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: 'transparent', color: T.blue, border: 'none',
              borderRadius: '6px', cursor: 'pointer',
              fontSize: '11.5px', fontWeight: 500,
              fontFamily: 'inherit', transition: 'background 0.14s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.blueSoft; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <ShieldAlert size={12} style={{ flexShrink: 0 }} />
            {!collapsed && <span>ניהול מערכת</span>}
          </button>
        )}

        <button
          onClick={onSignOut}
          title="יציאה"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
            padding: collapsed ? '8px 0' : '7px 8px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: 'transparent', color: T.textDim, border: 'none',
            borderRadius: '6px', cursor: 'pointer',
            fontSize: '11.5px', fontWeight: 300,
            fontFamily: 'inherit', transition: 'background 0.14s, color 0.14s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = T.dangerSoft; e.currentTarget.style.color = T.danger; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textDim; }}
        >
          <LogOut size={12} style={{ flexShrink: 0 }} />
          {!collapsed && <span>יציאה</span>}
        </button>
      </div>
    </aside>
  );
}
