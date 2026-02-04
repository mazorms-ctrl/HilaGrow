import React from 'react';
import { colors, radius, shadows, components } from '../../styles/tokens';

export type CardVariant = 'default' | 'glass' | 'elevated' | 'premium';
export type CardPadding = 'sm' | 'md' | 'lg';

interface CardProps {
  variant?: CardVariant;
  padding?: CardPadding;
  hoverable?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'glass',
  padding = 'md',
  hoverable = false,
  onClick,
  className,
  style,
  children,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'glass':
        return {
          background: colors.surface.glass,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `1px solid ${colors.border.glass}`,
          boxShadow: shadows.sm,
        };
      case 'premium':
        return {
          background: colors.surface.glassDark,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${colors.border.glass}`,
          boxShadow: shadows.glassGlow,
        };
      case 'elevated':
        return {
          background: colors.surface.elevated,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${colors.border.light}`,
          boxShadow: shadows.md,
        };
      case 'default':
      default:
        return {
          background: colors.surface.default,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: `1px solid ${colors.border.default}`,
          boxShadow: shadows.sm,
        };
    }
  };

  const baseStyles = getVariantStyles();

  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        borderRadius: radius.lg,
        padding: components.card.padding[padding],
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: onClick ? 'pointer' : 'default',
        ...baseStyles,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (hoverable || onClick) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = shadows.lg;
          e.currentTarget.style.background = colors.surface.glassHover;
        }
      }}
      onMouseLeave={(e) => {
        if (hoverable || onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = baseStyles.boxShadow;
          e.currentTarget.style.background = baseStyles.background;
        }
      }}
    >
      {children}
    </div>
  );
};
