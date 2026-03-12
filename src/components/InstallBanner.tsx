/**
 * InstallBanner — PWA "Add to Home Screen" prompt for mobile.
 * - Android/Chrome: intercepts beforeinstallprompt, shows one-tap install button.
 * - iOS Safari: shows Share → Add to Home Screen instructions.
 * - Hides if already running in standalone mode (already installed).
 * - Dismissable; persists dismissal in sessionStorage so it doesn't reappear mid-session.
 */
import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';
import { colors, typography } from '@/styles/tokens';

// Detect iOS
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

// Detect standalone (already installed)
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as any).standalone === true;
}

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showAndroid, setShowAndroid]       = useState(false);
  const [showIOS, setShowIOS]               = useState(false);
  const [iosTooltip, setIosTooltip]         = useState(false);

  useEffect(() => {
    // Don't show if already installed or dismissed this session
    if (isStandalone()) return;
    if (sessionStorage.getItem('install-banner-dismissed')) return;

    if (isIOS()) {
      setShowIOS(true);
      return;
    }

    // Android / Chrome: wait for browser install trigger
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroid(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    sessionStorage.setItem('install-banner-dismissed', '1');
    setShowAndroid(false);
    setShowIOS(false);
    setIosTooltip(false);
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') dismiss();
    setDeferredPrompt(null);
    setShowAndroid(false);
  }

  const visible = showAndroid || showIOS;
  if (!visible) return null;

  return (
    <>
      {/* Banner */}
      <div
        className="flex md:hidden"
        style={{
          position: 'fixed',
          top: 64, // below MobileHeader (64px)
          left: 0, right: 0,
          zIndex: 49,
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
          padding: '10px 14px 10px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          direction: 'rtl',
          boxShadow: '0 2px 12px rgba(37,99,235,0.35)',
          fontFamily: typography.fontFamily,
        }}
      >
        {/* Icon */}
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(255,255,255,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {showIOS
            ? <Share size={18} color="#fff" />
            : <Download size={18} color="#fff" />}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
            הורד את האפליקציה
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.78)', marginTop: 1 }}>
            {showIOS
              ? 'לחץ על שיתוף ← "הוסף למסך הבית"'
              : 'גישה מהירה ישירות מהמסך הראשי'}
          </div>
        </div>

        {/* Action button */}
        {showAndroid && (
          <button
            onClick={handleInstall}
            style={{
              padding: '7px 14px', borderRadius: 8,
              background: '#fff', color: colors.brand.primary,
              border: 'none', cursor: 'pointer',
              fontSize: 12.5, fontWeight: 700,
              fontFamily: 'inherit', flexShrink: 0,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            התקן
          </button>
        )}

        {showIOS && (
          <button
            onClick={() => setIosTooltip(t => !t)}
            style={{
              padding: '7px 14px', borderRadius: 8,
              background: '#fff', color: colors.brand.primary,
              border: 'none', cursor: 'pointer',
              fontSize: 12.5, fontWeight: 700,
              fontFamily: 'inherit', flexShrink: 0,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            איך?
          </button>
        )}

        {/* Dismiss */}
        <button
          onClick={dismiss}
          style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'rgba(255,255,255,0.15)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0, color: '#fff',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* iOS instructions tooltip */}
      {iosTooltip && (
        <div
          className="flex md:hidden"
          style={{
            position: 'fixed',
            top: 64 + 58, // below banner
            left: 16, right: 16,
            zIndex: 49,
            background: '#1e293b',
            borderRadius: 14,
            padding: '14px 16px',
            direction: 'rtl',
            fontFamily: typography.fontFamily,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          {[
            { n: 1, text: 'פתח את Safari (חייב להיות Safari)' },
            { n: 2, text: 'לחץ על כפתור השיתוף 🔗 בתחתית המסך' },
            { n: 3, text: 'גלול למטה ובחר "הוסף למסך הבית"' },
            { n: 4, text: 'לחץ "הוסף" — האפליקציה תופיע כאייקון!' },
          ].map(({ n, text }) => (
            <div key={n} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              marginBottom: n < 4 ? 10 : 0,
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                background: colors.brand.primary,
                color: '#fff', fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>{n}</span>
              <span style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>{text}</span>
            </div>
          ))}
          <button
            onClick={() => setIosTooltip(false)}
            style={{
              marginTop: 12, width: '100%', padding: '8px',
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
              color: '#94a3b8', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            סגור
          </button>
        </div>
      )}
    </>
  );
}
