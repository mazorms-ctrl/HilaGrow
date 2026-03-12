import type { User } from '@supabase/supabase-js';

interface Props {
  user: User | null;
  onAddTask?: () => void;
}

export function MobileHeader(_props: Props) {
  return (
    <header
      className="flex md:hidden"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        height: 64,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(226,232,240,0.75)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        direction: 'ltr',
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
      } as React.CSSProperties}
    >
      {/* Brand block — mirrors desktop layout at mobile scale */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        direction: 'rtl', flexShrink: 0,
      }}>
        {/* Hillel-Yaffe logo — right side (first child in RTL flex) */}
        <div style={{ background: 'white', lineHeight: 0, borderRadius: 4 }}>
          <img
            src={`${import.meta.env.BASE_URL}hillel-yaffe-logo.png?v=2`}
            alt="הלל יפה"
            style={{
              height: 44, width: 'auto', objectFit: 'contain', display: 'block',
              filter: 'brightness(1) contrast(1.05)', mixBlendMode: 'multiply',
            }}
          />
        </div>

        {/* GROW | separator | יוצרים שינוי — left side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, direction: 'ltr' }}>
          <span style={{
            fontWeight: 900, fontSize: 24, color: '#0a0f1e',
            letterSpacing: '-0.5px', fontFamily: 'Rubik, sans-serif', lineHeight: 1,
            whiteSpace: 'nowrap',
          }}>
            GROW
          </span>
          <span style={{
            width: 1, height: 18, background: '#d1d5db',
            borderRadius: 1, flexShrink: 0, alignSelf: 'center',
          }} />
          <span style={{
            fontWeight: 300, fontSize: 14, color: '#6b7280',
            fontFamily: 'Rubik, sans-serif', lineHeight: 1,
            letterSpacing: '0.2px', whiteSpace: 'nowrap',
          }}>
            יוצרים שינוי
          </span>
        </div>
      </div>

    </header>
  );
}
