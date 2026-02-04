/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '480px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      colors: {
        // Neutrals
        neutral: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        // Priority colors
        priority: {
          p1: {
            bg: '#FEE2E2',
            border: '#FECACA',
            text: '#DC2626',
          },
          p2: {
            bg: '#FED7AA',
            border: '#FDBA74',
            text: '#EA580C',
          },
          p3: {
            bg: '#DBEAFE',
            border: '#BAE6FD',
            text: '#0284C7',
          },
        },
        // Status tags
        status: {
          purple: {
            bg: '#EDE9FE',
            text: '#7C3AED',
          },
          blue: {
            bg: '#DBEAFE',
            text: '#2563EB',
          },
          green: {
            bg: '#DCFCE7',
            text: '#16A34A',
          },
        },
        // Progress
        progress: {
          track: 'rgba(15, 23, 42, 0.08)',
          success: '#22C55E',
          primary: '#3B82F6',
          warning: '#F59E0B',
          danger: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Rubik', 'Heebo', 'Assistant', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        rubik: ['Rubik', 'Heebo', 'Assistant', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '1.45' }],
        sm: ['13px', { lineHeight: '1.45' }],
        base: ['14px', { lineHeight: '1.45' }],
        md: ['15px', { lineHeight: '1.45' }],
        lg: ['16px', { lineHeight: '1.45' }],
        xl: ['18px', { lineHeight: '1.2' }],
        '2xl': ['20px', { lineHeight: '1.2' }],
        '3xl': ['24px', { lineHeight: '1.2' }],
      },
      borderRadius: {
        xs: '6px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        pill: '9999px',
      },
      spacing: {
        4.5: '18px',
      },
      boxShadow: {
        hover: '0 6px 18px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
}
