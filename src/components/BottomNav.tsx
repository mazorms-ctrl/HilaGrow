import type { CSSProperties } from 'react';
import { Home, Briefcase, TreePine, Menu } from 'lucide-react';
import { colors, typography } from '@/styles/tokens';

export type MobileTab = 'home' | 'my-work' | 'big-picture' | 'settings';

interface BottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

// RTL order: first item appears on the RIGHT in a dir="rtl" flex container
const NAV_ITEMS: { tab: MobileTab; icon: React.ElementType; label: string }[] = [
  { tab: 'home',        icon: Home,      label: 'עמוד הבית'     },
  { tab: 'my-work',     icon: Briefcase, label: 'המשימות שלי'   },
  { tab: 'big-picture', icon: TreePine,  label: 'התמונה הגדולה' },
  { tab: 'settings',    icon: Menu,      label: 'תפריט'          },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav
      className="md:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderTop: '1px solid rgba(226,232,240,0.8)',
        display: 'flex',
        height: '56px',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        direction: 'rtl',
      } as CSSProperties}
    >
      {NAV_ITEMS.map(({ tab, icon: Icon, label }) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: isActive ? colors.brand.primary : colors.text.tertiary,
              transition: 'color 0.15s ease',
              fontFamily: typography.fontFamily,
              WebkitTapHighlightColor: 'transparent',
              padding: '0 2px',
            } as CSSProperties}
          >
            <Icon size={21} strokeWidth={isActive ? 2.2 : 1.8} />
            <span style={{
              fontSize: '9px',
              fontWeight: isActive ? '600' : '400',
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
