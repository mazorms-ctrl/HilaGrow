import { useState } from 'react';
import { Activity, AlertTriangle, Info } from 'lucide-react';
import { useDashboardKpis } from '@/lib/supabase-hooks';
import { colors, radius, shadows, spacing, transitions, typography } from '@/styles/tokens';
import type { TaskFilter } from './CommandCenter';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accentColor: string;
  accentBg: string;
  cardShadow: string;
  loading: boolean;
  urgent?: boolean;
  tooltip?: string;
  filterId?: TaskFilter;
  activeFilter?: TaskFilter;
  onFilterChange?: (f: TaskFilter) => void;
}

function KpiCard({
  label, value, icon: Icon, accentColor, accentBg, cardShadow,
  loading, urgent, tooltip, filterId, activeFilter, onFilterChange,
}: KpiCardProps) {
  const [tipVisible, setTipVisible] = useState(false);
  const isClickable = !!filterId && !!onFilterChange;
  const isSelected  = isClickable && activeFilter === filterId;

  return (
    <div
      onClick={isClickable ? () => onFilterChange!(filterId!) : undefined}
      style={{
        background: colors.surface.elevated,
        borderRadius: radius.lg,
        padding: spacing.xl,
        boxShadow: isSelected ? `0 0 0 2px ${accentColor}, ${cardShadow}` : cardShadow,
        border: `1px solid ${isSelected ? accentColor : colors.border.light}`,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.md,
        cursor: isClickable ? 'pointer' : 'default',
        transition: `border-color ${transitions.fast}, box-shadow ${transitions.fast}, transform ${transitions.fast}`,
        transform: isSelected ? 'translateY(-2px)' : 'none',
        userSelect: 'none' as React.CSSProperties['userSelect'],
      }}
    >
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Label + optional info icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: colors.text.secondary,
            }}
          >
            {label}
          </span>

          {tooltip && (
            <div
              style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
              onMouseEnter={() => setTipVisible(true)}
              onMouseLeave={() => setTipVisible(false)}
            >
              <Info size={14} color={colors.text.tertiary} style={{ cursor: 'help' }} />

              {tipVisible && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 8px)',
                    right: '50%',
                    transform: 'translateX(50%)',
                    background: colors.text.primary,
                    color: colors.text.inverse,
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.normal,
                    lineHeight: typography.lineHeight.normal,
                    padding: '6px 10px',
                    borderRadius: radius.sm,
                    whiteSpace: 'nowrap',
                    zIndex: 50,
                    pointerEvents: 'none',
                    boxShadow: shadows.md,
                  }}
                >
                  {tooltip}
                  <span
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: '50%',
                      transform: 'translateX(50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '5px solid transparent',
                      borderRight: '5px solid transparent',
                      borderTop: `5px solid ${colors.text.primary}`,
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: radius.sm,
            background: isSelected ? accentColor : accentBg,
            flexShrink: 0,
            transition: `background ${transitions.fast}`,
          }}
        >
          <Icon size={17} color={isSelected ? colors.text.inverse : accentColor} />
        </span>
      </div>

      {/* Value */}
      <div
        style={{
          fontSize: loading ? typography.fontSize.xl : typography.fontSize.display,
          fontWeight: typography.fontWeight.black,
          color: urgent ? colors.semantic.danger : colors.text.primary,
          lineHeight: 1,
          letterSpacing: '-1px',
          fontFamily: typography.fontFamily,
        }}
      >
        {loading ? '—' : value}
      </div>
    </div>
  );
}

interface KpiCardsProps {
  activeFilter: TaskFilter;
  onFilterChange: (f: TaskFilter) => void;
}

export function KpiCards({ activeFilter, onFilterChange }: KpiCardsProps) {
  const { data, isLoading } = useDashboardKpis();

  return (
    <div
      dir="rtl"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: spacing.lg,
      }}
    >
      <KpiCard
        label="משימות פעילות"
        value={data?.active_tasks ?? 0}
        icon={Activity}
        accentColor={colors.brand.primary}
        accentBg={colors.brand.light}
        cardShadow={shadows.brand}
        loading={isLoading}
        tooltip="משימה פעילה היא משימה עם תאריך יעד (SLA) או התקדמות מעל 0%."
        filterId="active"
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
      />
      <KpiCard
        label="באיחור"
        value={data?.overdue_tasks ?? 0}
        icon={AlertTriangle}
        accentColor={colors.semantic.danger}
        accentBg={colors.semantic.dangerLight}
        cardShadow={(data?.overdue_tasks ?? 0) > 0 ? shadows.danger : shadows.sm}
        loading={isLoading}
        urgent={(data?.overdue_tasks ?? 0) > 0}
        filterId="overdue"
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
      />
    </div>
  );
}
