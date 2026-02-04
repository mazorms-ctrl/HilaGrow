import React from 'react';
import { colors, radius, typography, spacing, shadows, components } from '../../styles/tokens';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  fullWidth = false,
  style,
  ...props
}) => {
  return (
    <div style={{ width: fullWidth ? '100%' : 'auto' }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            color: colors.text.secondary,
            marginBottom: spacing.sm,
            fontFamily: typography.fontFamily,
          }}
        >
          {label}
        </label>
      )}
      <input
        style={{
          width: fullWidth ? '100%' : 'auto',
          height: components.input.height,
          padding: components.input.padding,
          borderRadius: radius.md,
          border: `1px solid ${error ? colors.semantic.danger : colors.border.default}`,
          fontSize: typography.fontSize.base,
          fontFamily: typography.fontFamily,
          background: colors.surface.default,
          color: colors.text.primary,
          outline: 'none',
          transition: 'all 0.2s',
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = colors.brand.primary;
          e.currentTarget.style.boxShadow = shadows.focus;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? colors.semantic.danger : colors.border.default;
          e.currentTarget.style.boxShadow = 'none';
        }}
        {...props}
      />
      {error && (
        <div
          style={{
            marginTop: spacing.xs,
            fontSize: typography.fontSize.xs,
            color: colors.semantic.danger,
            fontFamily: typography.fontFamily,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  fullWidth = false,
  style,
  ...props
}) => {
  return (
    <div style={{ width: fullWidth ? '100%' : 'auto' }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            color: colors.text.secondary,
            marginBottom: spacing.sm,
            fontFamily: typography.fontFamily,
          }}
        >
          {label}
        </label>
      )}
      <textarea
        style={{
          width: fullWidth ? '100%' : 'auto',
          padding: spacing.md,
          borderRadius: radius.md,
          border: `1px solid ${error ? colors.semantic.danger : colors.border.default}`,
          fontSize: typography.fontSize.base,
          fontFamily: typography.fontFamily,
          background: colors.surface.default,
          color: colors.text.primary,
          outline: 'none',
          resize: 'vertical',
          transition: 'all 0.2s',
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = colors.brand.primary;
          e.currentTarget.style.boxShadow = shadows.focus;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? colors.semantic.danger : colors.border.default;
          e.currentTarget.style.boxShadow = 'none';
        }}
        {...props}
      />
      {error && (
        <div
          style={{
            marginTop: spacing.xs,
            fontSize: typography.fontSize.xs,
            color: colors.semantic.danger,
            fontFamily: typography.fontFamily,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};
