import React from 'react';
import { colors, radius, typography, spacing, components } from '../../styles/tokens';

export type ChipVariant = 'default' | 'p1' | 'p2' | 'p3' | 'success' | 'warning' | 'danger' | 'info';

interface ChipProps {
  variant?: ChipVariant;
  icon?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const Chip: React.FC<ChipProps> = ({
  variant = 'default',
  icon,
  children,
  style,
  onClick,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'p1':
        return {
          background: colors.priority.p1.bg,
          color: colors.priority.p1.text,
          border: `1px solid ${colors.priority.p1.border}`,
        };
      case 'p2':
        return {
          background: colors.priority.p2.bg,
          color: colors.priority.p2.text,
          border: `1px solid ${colors.priority.p2.border}`,
        };
      case 'p3':
        return {
          background: colors.priority.p3.bg,
          color: colors.priority.p3.text,
          border: `1px solid ${colors.priority.p3.border}`,
        };
      case 'success':
        return {
          background: colors.semantic.successLight,
          color: colors.semantic.success,
          border: `1px solid ${colors.semantic.success}`,
        };
      case 'warning':
        return {
          background: colors.semantic.warningLight,
          color: colors.semantic.warning,
          border: `1px solid ${colors.semantic.warning}`,
        };
      case 'danger':
        return {
          background: colors.semantic.dangerLight,
          color: colors.semantic.danger,
          border: `1px solid ${colors.semantic.danger}`,
        };
      case 'info':
        return {
          background: colors.semantic.infoLight,
          color: colors.semantic.info,
          border: `1px solid ${colors.semantic.info}`,
        };
      case 'default':
      default:
        return {
          background: colors.surface.hover,
          color: colors.text.secondary,
          border: `1px solid ${colors.border.default}`,
        };
    }
  };

  const baseStyles = getVariantStyles();

  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        height: components.chip.height,
        padding: components.chip.padding,
        borderRadius: radius.full,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.bold,
        fontFamily: typography.fontFamily,
        cursor: onClick ? 'pointer' : 'default',
        ...baseStyles,
        ...style,
      }}
    >
      {icon && <span style={{ fontSize: '10px' }}>{icon}</span>}
      {children}
    </span>
  );
};
