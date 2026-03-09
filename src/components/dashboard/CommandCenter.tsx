import { useState } from 'react';
import { colors, spacing, typography } from '@/styles/tokens';
import { useDashboardRealtime } from '@/lib/supabase-hooks';
import { KpiCards } from './KpiCards';
import { ProjectTaskList } from './ProjectTaskList';
import { ActivityFeed } from './ActivityFeed';

export type TaskFilter = 'active' | 'overdue';

export function CommandCenter() {
  const [activeFilter, setActiveFilter] = useState<TaskFilter>('active');
  useDashboardRealtime(); // single subscription — invalidates all dashboard queries on any task change

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

      {/* Activity feed — top priority: real-time field updates */}
      <ActivityFeed />

      {/* KPI Cards — clicking a card filters the task list */}
      <KpiCards activeFilter={activeFilter} onFilterChange={setActiveFilter} />

      {/* Active task list — filtered by selected KPI card */}
      <section style={{ paddingBottom: spacing.xxxxl }}>
        <ProjectTaskList filter={activeFilter} />
      </section>
    </div>
  );
}
