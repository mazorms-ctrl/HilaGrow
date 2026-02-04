import React from 'react';
import { colors, radius, typography, spacing, shadows, transitions } from '../../styles/tokens';

interface StatPillProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const StatPill: React.FC<StatPillProps> = ({
  icon,
  label,
  value,
  variant = 'default',
  onClick,
  style,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          background: colors.semantic.successLight,
          color: colors.semantic.success,
          border: `2px solid ${colors.semantic.success}`,
        };
      case 'warning':
        return {
          background: colors.semantic.warningLight,
          color: colors.semantic.warning,
          border: `2px solid ${colors.semantic.warning}`,
        };
      case 'danger':
        return {
          background: colors.semantic.dangerLight,
          color: colors.semantic.danger,
          border: `2px solid ${colors.semantic.danger}`,
        };
      case 'info':
        return {
          background: colors.semantic.infoLight,
          color: colors.semantic.info,
          border: `2px solid ${colors.semantic.info}`,
        };
      case 'default':
      default:
        return {
          background: colors.surface.default,
          color: colors.text.primary,
          border: `2px solid ${colors.border.default}`,
        };
    }
  };

  const baseStyles = getVariantStyles();

  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.sm,
        padding: `${spacing.sm} ${spacing.lg}`,
        borderRadius: radius.lg,
        cursor: onClick ? 'pointer' : 'default',
        transition: transitions.base,
        boxShadow: shadows.xs,
        ...baseStyles,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = shadows.sm;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = shadows.xs;
        }
      }}
    >
      <span style={{ fontSize: '18px' }}>{icon}</span>
      <div>
        <div
          style={{
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.medium,
            fontFamily: typography.fontFamily,
            opacity: 0.8,
            marginBottom: '2px',
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: typography.fontSize.h2,
            fontWeight: typography.fontWeight.bold,
            fontFamily: typography.fontFamily,
            lineHeight: 1,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
};
