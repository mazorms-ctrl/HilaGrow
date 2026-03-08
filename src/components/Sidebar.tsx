import { useState, useEffect } from 'react';
import { FolderOpen, FolderPlus, Plus, LogOut, ChevronRight, Layers } from 'lucide-react';
import { useProjects, createProject } from '@/lib/supabase-hooks';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/contexts/AuthContext';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          '#1c2333',   // charcoal-blue base
  bgHeader:    '#212840',   // slightly lighter for user card
  bgActive:    'rgba(99,102,241,0.18)',
  bgHover:     'rgba(255,255,255,0.06)',
  border:      'rgba(255,255,255,0.07)',
  accent:      '#6366f1',   // indigo
  accentLight: '#818cf8',
  text:        '#e2e8f0',
  textMuted:   'rgba(226,232,240,0.45)',
  textDim:     'rgba(226,232,240,0.28)',
  danger:      '#f87171',
  dangerBg:    'rgba(239,68,68,0.12)',
};

interface Props {
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  user: User;
  profile: Profile | null;
  onSignOut: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  selectedProjectId,
  onSelectProject,
  user,
  profile,
  onSignOut,
  collapsed,
  onToggleCollapse,
}: Props) {
  const { projects, loading, refetch } = useProjects();
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Auto-select the first project when the list loads
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      onSelectProject(projects[0].id);
    }
  }, [projects, selectedProjectId, onSelectProject]);

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const id = await createProject(newProjectName.trim());
      await refetch();
      onSelectProject(id);
      setNewProjectName('');
      setShowNewProject(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'שגיאה ביצירת פרויקט');
    } finally {
      setCreating(false);
    }
  }

  const displayName = profile?.full_name || user.email || '';
  const emailDisplay = profile?.full_name ? user.email : undefined;
  const initials = (profile?.full_name || user.email || '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const w = collapsed ? '60px' : '256px';

  return (
    <aside
      dir="rtl"
      style={{
        width: w,
        minWidth: w,
        maxWidth: w,
        background: C.bg,
        color: C.text,
        display: 'flex',
        flexDirection: 'column',
        // Shadow on the LEFT edge (between sidebar and main content)
        borderLeft: `1px solid ${C.border}`,
        boxShadow: '-6px 0 24px rgba(0,0,0,0.22)',
        transition: 'width 0.25s cubic-bezier(.4,0,.2,1), min-width 0.25s cubic-bezier(.4,0,.2,1)',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {/* ── User profile card ─────────────────────────────────────── */}
      <div style={{
        background: C.bgHeader,
        padding: collapsed ? '20px 0 16px' : '20px 16px 16px',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: collapsed ? 'column' : 'row',
        alignItems: 'center',
        gap: collapsed ? '0' : '12px',
      }}>
        {/* Avatar */}
        <div style={{
          width: '40px',
          height: '40px',
          minWidth: '40px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '700',
          fontSize: '15px',
          color: 'white',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
          letterSpacing: '0.5px',
        }}>
          {initials}
        </div>

        {!collapsed && (
          <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: C.text,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: '1.3',
              textAlign: 'right',
            }}>
              {displayName}
            </div>
            {emailDisplay && (
              <div style={{
                fontSize: '11px',
                color: C.textMuted,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: '2px',
                textAlign: 'right',
              }}>
                {emailDisplay}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Projects section ──────────────────────────────────────── */}
      <div style={{
        flex: 1,
        padding: collapsed ? '16px 8px' : '16px 10px',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>

        {/* Section label */}
        {!collapsed && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 6px',
            marginBottom: '10px',
          }}>
            <Layers size={12} style={{ color: C.textDim, flexShrink: 0 }} />
            <span style={{
              fontSize: '10px',
              fontWeight: '700',
              color: C.textDim,
              textTransform: 'uppercase',
              letterSpacing: '1.4px',
            }}>
              פרויקטים
            </span>
          </div>
        )}

        {/* Project list */}
        {loading ? (
          <div style={{
            padding: '10px 6px',
            color: C.textMuted,
            fontSize: '12px',
            textAlign: 'center',
          }}>
            {collapsed ? '…' : 'טוען פרויקטים...'}
          </div>
        ) : projects.length === 0 && !showNewProject ? (
          !collapsed && (
            <div style={{
              padding: '20px 8px',
              color: C.textMuted,
              fontSize: '12px',
              textAlign: 'center',
              lineHeight: '1.7',
            }}>
              אין פרויקטים עדיין.
              <br />
              צור את הראשון!
            </div>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {projects.map(project => {
              const isSelected = selectedProjectId === project.id;
              return (
                <button
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  title={collapsed ? project.name : undefined}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: collapsed ? '10px 0' : '10px 12px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    borderRadius: '8px',
                    border: isSelected ? `1px solid rgba(99,102,241,0.35)` : '1px solid transparent',
                    background: isSelected ? C.bgActive : 'transparent',
                    color: isSelected ? C.accentLight : C.textMuted,
                    cursor: 'pointer',
                    fontSize: '13.5px',
                    fontWeight: isSelected ? '600' : '400',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s ease',
                    textAlign: 'right',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = C.bgHover;
                      e.currentTarget.style.color = C.text;
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = C.textMuted;
                    }
                  }}
                >
                  <FolderOpen
                    size={15}
                    style={{
                      flexShrink: 0,
                      color: isSelected ? C.accent : C.textDim,
                    }}
                  />
                  {!collapsed && (
                    <span style={{
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      direction: 'rtl',
                      textAlign: 'right',
                    }}>
                      {project.name}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── New project ─────────────────────────────────────────── */}
        <div style={{ marginTop: projects.length > 0 ? '8px' : '0' }}>
          {!collapsed && (
            showNewProject ? (
              <form onSubmit={handleCreateProject}>
                <input
                  autoFocus
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="שם הפרויקט..."
                  dir="rtl"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: 'rgba(255,255,255,0.08)',
                    border: `1px solid ${C.accent}`,
                    borderRadius: '8px',
                    color: C.text,
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    marginBottom: '8px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    textAlign: 'right',
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Escape') { setShowNewProject(false); setCreateError(null); }
                  }}
                />
                {createError && (
                  <div style={{ fontSize: '11px', color: C.danger, marginBottom: '6px', textAlign: 'right' }}>
                    {createError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="submit"
                    disabled={creating || !newProjectName.trim()}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: `linear-gradient(135deg, ${C.accent}, #8b5cf6)`,
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: creating ? 'not-allowed' : 'pointer',
                      opacity: creating ? 0.65 : 1,
                      fontFamily: 'inherit',
                    }}
                  >
                    {creating ? 'יוצר...' : 'צור פרויקט'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNewProject(false); setCreateError(null); }}
                    style={{
                      padding: '8px 14px',
                      background: 'transparent',
                      color: C.textMuted,
                      border: `1px solid ${C.border}`,
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    ביטול
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowNewProject(true)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: '10px',
                  padding: '10px 12px',
                  border: `1px dashed rgba(99,102,241,0.35)`,
                  borderRadius: '8px',
                  background: 'transparent',
                  color: C.textMuted,
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = C.accent;
                  e.currentTarget.style.color = C.accentLight;
                  e.currentTarget.style.background = 'rgba(99,102,241,0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)';
                  e.currentTarget.style.color = C.textMuted;
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <FolderPlus size={15} style={{ flexShrink: 0 }} />
                <span>פרויקט חדש</span>
              </button>
            )
          )}

          {/* Collapsed: just the + icon */}
          {collapsed && (
            <button
              onClick={() => { onToggleCollapse(); setTimeout(() => setShowNewProject(true), 260); }}
              title="פרויקט חדש"
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                padding: '10px 0',
                border: `1px dashed rgba(99,102,241,0.35)`,
                borderRadius: '8px',
                background: 'transparent',
                color: C.textMuted,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Footer: collapse toggle + sign out ───────────────────── */}
      <div style={{
        borderTop: `1px solid ${C.border}`,
        padding: collapsed ? '10px 8px' : '10px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        {/* Collapse toggle */}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'הרחב תפריט' : 'כווץ תפריט'}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: collapsed ? '9px 0' : '9px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: 'transparent',
            color: C.textDim,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: 'inherit',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = C.bgHover;
            e.currentTarget.style.color = C.textMuted;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = C.textDim;
          }}
        >
          {/* Right sidebar: ChevronRight = "collapse rightward", rotated = "expand leftward" */}
          <ChevronRight
            size={15}
            style={{
              flexShrink: 0,
              transform: collapsed ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.25s',
            }}
          />
          {!collapsed && <span>כווץ תפריט</span>}
        </button>

        {/* Sign out */}
        <button
          onClick={onSignOut}
          title="יציאה"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: collapsed ? '9px 0' : '9px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: 'transparent',
            color: C.textDim,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontFamily: 'inherit',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = C.dangerBg;
            e.currentTarget.style.color = C.danger;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = C.textDim;
          }}
        >
          <LogOut size={14} style={{ flexShrink: 0 }} />
          {!collapsed && <span>יציאה</span>}
        </button>
      </div>
    </aside>
  );
}
