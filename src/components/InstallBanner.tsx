/**
 * InstallBanner — PWA "Add to Home Screen" prompt for mobile.
 *
 * Android/Chrome: intercepts beforeinstallprompt → one-tap install.
 * iOS Safari: shows numbered Share instructions.
 * Already standalone: never renders.
 * Dismissed: localStorage with 30-day expiry → won't re-appear on refresh.
 *
 * Positioned as a floating bar just above the bottom nav (bottom-anchored).
 */
import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';
import { colors, typography } from '@/styles/tokens';

const STORAGE_KEY  = 'grow-install-dismissed';
const DISMISS_DAYS = 30;

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as any).standalone === true;
}

function isDismissed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const { until } = JSON.parse(raw);
    return Date.now() < until;
  } catch {
    return false;
  }
}

function persistDismiss() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      until: Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000,
    }));
  } catch { /* quota issues — ignore */ }
}

// Bottom nav height (56px icons + ~16px credit strip) + safe-area
const NAV_HEIGHT = 'calc(env(safe-area-inset-bottom, 0px) + 78px)';

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showAndroid, setShowAndroid]       = useState(false);
  const [showIOS, setShowIOS]               = useState(false);
  const [iosSteps, setIosSteps]             = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissed()) return;

    if (isIOS()) {
      setShowIOS(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroid(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    persistDismiss();
    setShowAndroid(false);
    setShowIOS(false);
    setIosSteps(false);
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowAndroid(false);
    if (outcome === 'accepted') persistDismiss(); // already installed
  }

  if (!showAndroid && !showIOS) return null;

  return (
    <>
      {/* ── iOS step-by-step panel (slides up above banner) ── */}
      {iosSteps && (
        <div
          className="flex md:hidden"
          style={{
            position: 'fixed',
            bottom: `calc(${NAV_HEIGHT} + 62px)`, // above the banner
            left: 12, right: 12,
            zIndex: 48,
            background: '#1e293b',
            borderRadius: 16,
            padding: '16px 16px 12px',
            direction: 'rtl',
            fontFamily: typography.fontFamily,
            boxShadow: '0 -4px 32px rgba(0,0,0,0.35)',
            flexDirection: 'column',
          }}
        >
          {[
            { n: 1, text: 'פתח את הדף ב-Safari (לא Chrome)' },
            { n: 2, text: 'לחץ על כפתור השיתוף ⬆ בתחתית הדפדפן' },
            { n: 3, text: 'גלול ובחר "הוסף למסך הבית" ➕' },
            { n: 4, text: 'לחץ "הוסף" — GROW+ תופיע כאפליקציה!' },
          ].map(({ n, text }) => (
            <div key={n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: n < 4 ? 10 : 14 }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: colors.brand.primary, color: '#fff',
                fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{n}</span>
              <span style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.55 }}>{text}</span>
            </div>
          ))}
          <button
            onClick={() => setIosSteps(false)}
            style={{
              width: '100%', padding: '8px', background: 'rgba(255,255,255,0.08)',
              border: 'none', borderRadius: 8, color: '#94a3b8',
              fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            סגור הוראות
          </button>
        </div>
      )}

      {/* ── Main banner — floats above bottom nav ── */}
      <div
        className="flex md:hidden"
        style={{
          position: 'fixed',
          bottom: NAV_HEIGHT,
          left: 10, right: 10,
          zIndex: 48,
          background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #3b82f6 100%)',
          borderRadius: 14,
          padding: '11px 12px 11px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          direction: 'rtl',
          fontFamily: typography.fontFamily,
          boxShadow: '0 4px 24px rgba(37,99,235,0.45), 0 1px 4px rgba(0,0,0,0.12)',
        }}
      >
        {/* App icon placeholder */}
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: 'rgba(255,255,255,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {showIOS
            ? <Share size={19} color="#fff" />
            : <Download size={19} color="#fff" />}
        </div>

        {/* Copy */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.25 }}>
            GROW+ מוכנה להתקנה
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
            {showIOS ? 'לחץ "איך?" לפירוט' : 'לחץ להוספה למסך הבית'}
          </div>
        </div>

        {/* CTA */}
        {showAndroid && (
          <button
            onClick={handleInstall}
            style={{
              padding: '8px 16px', borderRadius: 9,
              background: '#fff', color: colors.brand.primary,
              border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
              flexShrink: 0, WebkitTapHighlightColor: 'transparent',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}
          >
            הוסף
          </button>
        )}

        {showIOS && (
          <button
            onClick={() => setIosSteps(s => !s)}
            style={{
              padding: '8px 14px', borderRadius: 9,
              background: '#fff', color: colors.brand.primary,
              border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
              flexShrink: 0, WebkitTapHighlightColor: 'transparent',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}
          >
            איך?
          </button>
        )}

        {/* Dismiss */}
        <button
          onClick={dismiss}
          style={{
            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
            background: 'rgba(255,255,255,0.15)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff',
            WebkitTapHighlightColor: 'transparent',
          }}
          title="סגור"
        >
          <X size={13} />
        </button>
      </div>
    </>
  );
}
