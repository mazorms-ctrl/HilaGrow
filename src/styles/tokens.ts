// Design Tokens - Glassmorphism Premium Medical System
// Hospital Process Management System

export const colors = {
  // Base (Clean White with Gradient Background)
  background: {
    primary: 'linear-gradient(135deg, #EFF6FF 0%, #E0F2FE 50%, #F0F9FF 100%)',
    secondary: '#FFFFFF',
    elevated: 'rgba(255, 255, 255, 0.95)',
    glass: 'rgba(255, 255, 255, 0.7)',
    glassDark: 'rgba(255, 255, 255, 0.85)',
  },
  
  // Brand/Accent (Medical Blue - Professional & Trustworthy)
  brand: {
    primary: '#3B82F6',
    secondary: '#60A5FA',
    hover: '#2563EB',
    light: '#DBEAFE',
    dark: '#1E40AF',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #0EA5E9 100%)',
    gradientSubtle: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(14, 165, 233, 0.08) 100%)',
  },
  
  // Semantic Colors
  semantic: {
    success: '#22C55E',
    successLight: '#DCFCE7',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    danger: '#EF4444',
    dangerLight: '#FEE2E2',
    info: '#6366F1',
    infoLight: '#E0E7FF',
  },
  
  // Priority System (Gradient-based)
  priority: {
    p1: {
      bg: '#FEE2E2',
      text: '#DC2626',
      border: '#FECACA',
      gradient: 'linear-gradient(135deg, #FCA5A5 0%, #EF4444 100%)',
      glow: '0 4px 20px rgba(239, 68, 68, 0.3)',
    },
    p2: {
      bg: '#FED7AA',
      text: '#EA580C',
      border: '#FDBA74',
      gradient: 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)',
      glow: '0 4px 20px rgba(245, 158, 11, 0.3)',
    },
    p3: {
      bg: '#DBEAFE',
      text: '#0284C7',
      border: '#BAE6FD',
      gradient: 'linear-gradient(135deg, #7DD3FC 0%, #0EA5E9 100%)',
      glow: '0 4px 20px rgba(14, 165, 233, 0.3)',
    },
  },
  
  // Text Colors (Darker for better contrast on glass)
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#64748B',
    disabled: '#94A3B8',
    inverse: '#FFFFFF',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
  },
  
  // Border Colors (Subtle for glass effect)
  border: {
    light: 'rgba(226, 232, 240, 0.6)',
    default: 'rgba(203, 213, 225, 0.5)',
    medium: 'rgba(148, 163, 184, 0.6)',
    strong: 'rgba(100, 116, 139, 0.8)',
    accent: '#3B82F6',
    glass: 'rgba(255, 255, 255, 0.3)',
  },
  
  // Surface Colors (Glass everywhere!)
  surface: {
    default: 'rgba(255, 255, 255, 0.8)',
    elevated: 'rgba(255, 255, 255, 0.95)',
    hover: 'rgba(248, 250, 252, 0.9)',
    selected: 'rgba(219, 234, 254, 0.5)',
    overlay: 'rgba(15, 23, 42, 0.5)',
    glass: 'rgba(255, 255, 255, 0.6)',
    glassDark: 'rgba(255, 255, 255, 0.85)',
    glassHover: 'rgba(255, 255, 255, 0.75)',
  },
  // Focus Ring
  focus: {
    ring: '#3B82F6',
    ringOpacity: '0.15',
  },
} as const;

// Spacing Scale (8pt grid — rem so it scales with the fluid html font-size)
export const spacing = {
  xs: '0.25rem',   /* 4px @ base */
  sm: '0.5rem',    /* 8px @ base */
  md: '0.75rem',   /* 12px @ base */
  lg: '1rem',      /* 16px @ base */
  xl: '1.25rem',   /* 20px @ base */
  xxl: '1.5rem',   /* 24px @ base */
  xxxl: '2rem',    /* 32px @ base */
  xxxxl: '3rem',   /* 48px @ base */
} as const;

// Border Radius (Rounded for modern feel)
export const radius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
  full: '9999px',
} as const;

// Typography Scale (Compact)
export const typography = {
  fontSize: {
    xs: '0.75rem',    /* 12px @ base */
    sm: '0.875rem',   /* 14px @ base */
    base: '0.9375rem',/* 15px @ base */
    md: '1rem',       /* 16px @ base */
    lg: '1.125rem',   /* 18px @ base */
    xl: '1.25rem',    /* 20px @ base */
    h3: '1.5rem',     /* 24px @ base */
    h2: '1.75rem',    /* 28px @ base */
    h1: '2rem',       /* 32px @ base */
    display: '2.5rem',/* 40px @ base */
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    black: '800',
  },
  lineHeight: {
    tight: '1.2',
    normal: '1.5',
    relaxed: '1.75',
  },
  fontFamily: 'Rubik',
} as const;

// Shadows (Soft & Glassy)
export const shadows = {
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.06)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.06)',
  xxl: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
  
  // Colored shadows (for premium feel)
  brand: '0 4px 20px rgba(59, 130, 246, 0.2)',
  brandHover: '0 8px 30px rgba(59, 130, 246, 0.3)',
  danger: '0 4px 20px rgba(239, 68, 68, 0.2)',
  success: '0 4px 20px rgba(34, 197, 94, 0.2)',
  
  // Glass glow
  glassGlow: '0 8px 32px rgba(59, 130, 246, 0.12)',
  
  // Focus ring
  focus: '0 0 0 4px rgba(59, 130, 246, 0.15)',
} as const;

// Transitions
export const transitions = {
  fast: '0.15s ease',
  base: '0.2s ease',
  slow: '0.3s ease',
  
  timing: {
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

// Z-Index Scale
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  drawer: 1200,
  modal: 1300,
  toast: 1400,
  tooltip: 1500,
} as const;

// Breakpoints (for responsive)
export const breakpoints = {
  mobile: '640px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px',
} as const;

// Component-specific tokens
export const components = {
  button: {
    height: {
      sm: '32px',
      md: '36px',
      lg: '40px',
    },
    padding: {
      sm: '0 12px',
      md: '0 16px',
      lg: '0 20px',
    },
  },
  
  input: {
    height: '36px',
    padding: '0 12px',
  },
  
  chip: {
    height: '24px',
    padding: '0 10px',
  },
  
  card: {
    padding: {
      sm: spacing.lg,
      md: spacing.xl,
      lg: spacing.xxl,
    },
  },
} as const;

// Export utility functions
export const getColor = (path: string) => {
  const keys = path.split('.');
  let value: any = colors;
  for (const key of keys) {
    value = value[key];
  }
  return value;
};

export const rgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
