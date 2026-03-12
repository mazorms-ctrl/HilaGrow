import { Plus } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { colors } from '@/styles/tokens';

interface Props {
  user: User | null;
  onAddTask?: () => void;
}

export function MobileHeader({ user, onAddTask }: Props) {
  return (
    <header
      className="flex md:hidden"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        height: 56,
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
      {/* GROW wordmark — centered */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontWeight: 900, fontSize: 22, color: '#0a0f1e',
          letterSpacing: '-0.5px', fontFamily: 'Rubik, sans-serif', lineHeight: 1,
        }}>
          GROW
        </span>
        <span style={{
          width: 1.5, background: '#d1d5db', alignSelf: 'stretch',
          borderRadius: 1, flexShrink: 0,
        }} />
        <span style={{
          fontWeight: 300, fontSize: 13, color: '#4b5563',
          fontFamily: 'Rubik, sans-serif', lineHeight: 1,
        }}>
          יוצרים שינוי
        </span>
      </div>

      {/* + button — physical right side */}
      {user && onAddTask && (
        <button
          onClick={onAddTask}
          style={{
            position: 'absolute',
            right: 14, top: '50%', transform: 'translateY(-50%)',
            width: 34, height: 34, borderRadius: 10,
            background: colors.brand.primary,
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
            WebkitTapHighlightColor: 'transparent',
          } as React.CSSProperties}
          title="הוסף משימה"
        >
          <Plus size={18} color="#fff" strokeWidth={2.5} />
        </button>
      )}
    </header>
  );
}
