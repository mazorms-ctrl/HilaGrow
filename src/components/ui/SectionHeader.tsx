import React from 'react';
import { colors, typography, spacing } from '../../styles/tokens';

interface SectionHeaderProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  title,
  subtitle,
  action,
  style,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
        ...style,
      }}
    >
      <div>
        <h2
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            fontSize: typography.fontSize.h2,
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            fontFamily: typography.fontFamily,
            margin: 0,
          }}
        >
          {icon && <span style={{ fontSize: typography.fontSize.h1 }}>{icon}</span>}
          <span>{title}</span>
        </h2>
        {subtitle && (
          <p
            style={{
              fontSize: typography.fontSize.base,
              color: colors.text.tertiary,
              fontFamily: typography.fontFamily,
              margin: `${spacing.xs} 0 0 0`,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
