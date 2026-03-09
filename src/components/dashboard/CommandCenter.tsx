import { useState } from 'react';
import { colors, radius, spacing, typography } from '@/styles/tokens';
import { useDashboardRealtime } from '@/lib/supabase-hooks';
import { useAuth } from '@/contexts/AuthContext';
import { KpiCards } from './KpiCards';
import { ProjectTaskList } from './ProjectTaskList';
import { ActivityFeed } from './ActivityFeed';

export type TaskFilter = 'active' | 'overdue';

// ── Skeleton placeholder — shown while auth session is initialising ────────────

function DashboardSkeleton() {
  const pulse: React.CSSProperties = {
    background: `linear-gradient(90deg, ${colors.border.light} 25%, ${colors.surface.hover} 50%, ${colors.border.light} 75%)`,
    backgroundSize: '200% 100%',
    animation: 'skeletonPulse 1.4s ease infinite',
    borderRadius: radius.md,
  };

  return (
    <>
      <style>{`
        @keyframes skeletonPulse {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl, padding: spacing.xl, maxWidth: '960px', margin: '0 auto', width: '100%' }}>

        {/* Header */}
        <div>
          <div style={{ ...pulse, height: 28, width: 140, marginBottom: 8 }} />
          <div style={{ ...pulse, height: 16, width: 260 }} />
        </div>

        {/* Activity feed skeleton */}
        <div style={{ background: colors.surface.elevated, borderRadius: radius.lg, padding: spacing.xl, border: `1px solid ${colors.border.light}` }}>
          <div style={{ ...pulse, height: 16, width: 100, marginBottom: spacing.lg }} />
          {[1, 2, 3].map(i => (
            <div key={i} style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.md }}>
              <div style={{ ...pulse, width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ ...pulse, height: 14, width: '60%', marginBottom: 6 }} />
                <div style={{ ...pulse, height: 12, width: '40%' }} />
              </div>
            </div>
          ))}
        </div>

        {/* KPI cards skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spacing.lg }}>
          {[1, 2].map(i => (
            <div key={i} style={{ background: colors.surface.elevated, borderRadius: radius.lg, padding: spacing.xl, border: `1px solid ${colors.border.light}` }}>
              <div style={{ ...pulse, height: 14, width: 100, marginBottom: spacing.lg }} />
              <div style={{ ...pulse, height: 36, width: 60 }} />
            </div>
          ))}
        </div>

        {/* Task table skeleton */}
        <div style={{ background: colors.surface.elevated, borderRadius: radius.lg, border: `1px solid ${colors.border.light}`, overflow: 'hidden' }}>
          <div style={{ padding: spacing.lg, borderBottom: `1px solid ${colors.border.light}` }}>
            <div style={{ ...pulse, height: 16, width: 140 }} />
          </div>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ display: 'flex', gap: spacing.lg, padding: `${spacing.md} ${spacing.lg}`, borderBottom: `1px solid ${colors.border.light}` }}>
              <div style={{ ...pulse, height: 14, flex: '0 0 35%' }} />
              <div style={{ ...pulse, height: 14, flex: '0 0 25%' }} />
              <div style={{ ...pulse, height: 14, flex: '0 0 22%' }} />
              <div style={{ ...pulse, height: 14, flex: '0 0 12%' }} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Inner dashboard — only mounted after auth is confirmed ────────────────────

function DashboardContent() {
  const [activeFilter, setActiveFilter] = useState<TaskFilter>('active');
  useDashboardRealtime();

  return (
    <div
      dir="rtl"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.xl,
        padding: spacing.xl,
        maxWidth: '960px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Section header */}
      <div>
        <h2
          style={{
            fontSize: typography.fontSize.h2,
            fontWeight: typography.fontWeight.black,
            color: colors.text.primary,
            margin: 0,
            letterSpacing: '-0.5px',
            fontFamily: typography.fontFamily,
          }}
        >
          מרכז פיקוד
        </h2>
        <p
          style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
            margin: `${spacing.xs} 0 0`,
          }}
        >
          תמונת מצב בזמן אמת — ניהול לפי חריגות
        </p>
      </div>

      <ActivityFeed />
      <KpiCards activeFilter={activeFilter} onFilterChange={setActiveFilter} />

      <section style={{ paddingBottom: spacing.xxxxl }}>
        <ProjectTaskList filter={activeFilter} />
      </section>
    </div>
  );
}

// ── Public export — gates on auth state ──────────────────────────────────────

export function CommandCenter() {
  const { loading: authLoading } = useAuth();

  // Block all data-fetching children from mounting until the Supabase session
  // is confirmed. Without this guard, React Query fires queries before the JWT
  // is attached to the client, RLS returns empty rows, and the 30-second
  // staleTime means the cache stays empty until a manual refresh.
  if (authLoading) return <DashboardSkeleton />;

  return <DashboardContent />;
}
