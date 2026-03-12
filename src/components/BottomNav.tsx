import type { CSSProperties } from 'react';
import { Home, ListChecks, TreePine } from 'lucide-react';
import { colors, typography } from '@/styles/tokens';

export type ViewMode = 'command' | 'rows' | 'tree';

interface BottomNavProps {
  viewMode: ViewMode;
  onNavigate: (mode: ViewMode) => void;
}

const NAV_ITEMS: { mode: ViewMode; icon: React.ElementType; label: string }[] = [
  { mode: 'command', icon: Home,       label: 'בית'    },
  { mode: 'rows',    icon: ListChecks, label: 'משימות' },
  { mode: 'tree',    icon: TreePine,   label: 'עץ'     },
];

export function BottomNav({ viewMode, onNavigate }: BottomNavProps) {
  return (
    <nav
      className="md:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderTop: '1px solid rgba(226,232,240,0.8)',
        display: 'flex',
        height: '56px',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        direction: 'rtl',
      } as CSSProperties}
    >
      {NAV_ITEMS.map(({ mode, icon: Icon, label }) => {
        const isActive = viewMode === mode;
        return (
          <button
            key={mode}
            onClick={() => onNavigate(mode)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: isActive ? colors.brand.primary : colors.text.tertiary,
              transition: 'color 0.15s ease',
              fontFamily: typography.fontFamily,
              WebkitTapHighlightColor: 'transparent',
            } as CSSProperties}
          >
            <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
            <span style={{
              fontSize: '0.6875rem',
              fontWeight: isActive ? '600' : '400',
              letterSpacing: '0.01em',
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
