import React from 'react';
import { colors, radius, spacing, shadows, typography, transitions, components } from '../../styles/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  children,
  disabled,
  style,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: colors.brand.gradient,
          color: colors.text.inverse,
          border: 'none',
          boxShadow: shadows.brand,
          ':hover': {
            boxShadow: shadows.brandHover,
            transform: 'translateY(-2px)',
            filter: 'brightness(1.05)',
          },
        };
      case 'outline':
      case 'secondary':
        return {
          background: colors.surface.glass,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          color: colors.brand.primary,
          border: `1.5px solid ${colors.brand.primary}`,
          boxShadow: 'none',
          ':hover': {
            background: colors.brand.light,
            transform: 'translateY(-2px)',
            boxShadow: shadows.sm,
          },
        };
      case 'ghost':
        return {
          background: 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          color: colors.text.secondary,
          border: `1px solid ${colors.border.light}`,
          boxShadow: 'none',
          ':hover': {
            background: colors.surface.hover,
            borderColor: colors.border.medium,
          },
        };
      case 'danger':
        return {
          background: colors.semantic.danger,
          color: colors.text.inverse,
          border: 'none',
          boxShadow: shadows.danger,
          ':hover': {
            background: '#DC2626',
            transform: 'translateY(-2px)',
            filter: 'brightness(1.05)',
          },
        };
    }
  };

  const baseStyles = getVariantStyles();

  return (
    <button
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        height: components.button.height[size],
        padding: components.button.padding[size],
        borderRadius: radius.lg,
        fontSize: size === 'sm' ? typography.fontSize.sm : typography.fontSize.base,
        fontWeight: typography.fontWeight.bold,
        fontFamily: typography.fontFamily,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: transitions.base,
        opacity: disabled ? 0.5 : 1,
        width: fullWidth ? '100%' : 'auto',
        ...baseStyles,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && baseStyles[':hover']) {
          const hoverStyles = baseStyles[':hover'];
          if (hoverStyles.transform) e.currentTarget.style.transform = hoverStyles.transform;
          if (hoverStyles.boxShadow) e.currentTarget.style.boxShadow = hoverStyles.boxShadow;
          if (hoverStyles.filter) e.currentTarget.style.filter = hoverStyles.filter;
          if (hoverStyles.background) e.currentTarget.style.background = hoverStyles.background;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.background = baseStyles.background;
          e.currentTarget.style.boxShadow = baseStyles.boxShadow || 'none';
          e.currentTarget.style.filter = 'none';
        }
      }}
      {...props}
    >
      {icon && <span style={{ fontSize: size === 'sm' ? '14px' : '16px' }}>{icon}</span>}
      {children}
    </button>
  );
};
