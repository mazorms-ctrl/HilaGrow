import { useState } from 'react';
import { LoginModal } from '@/components/auth/LoginModal';

// ── Category chips ────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: 'העצמת הרגשת הערכה',      bg: '#DBEAFE', text: '#1D4ED8' },
  { label: 'פיתוח מתמחים',            bg: '#FEF9C3', text: '#854D0E' },
  { label: 'פיתוח רופאים בכירים',     bg: '#FCE7F3', text: '#9D174D' },
  { label: 'פרסום פנים ארגוני',       bg: '#FDF2F8', text: '#86198F' },
  { label: 'שיפור תשתיות ורווחה',    bg: '#ECFCCB', text: '#3F6212' },
  { label: 'תוכניות התפתחות כלליות', bg: '#CFFAFE', text: '#155E75' },
  { label: 'מחקר',                    bg: '#EEF2FF', text: '#3730A3' },
] as const;

// Desktop-only stagger offsets — zeroed on mobile via CSS
const CHIP_CLUSTER_OFFSETS: React.CSSProperties[] = [
  { marginTop: '8px',  marginInlineEnd: '10px' },
  { marginTop: '0px',  marginInlineStart: '12px', marginInlineEnd: '6px' },
  { marginTop: '14px', marginInlineStart: '8px' },
  { marginTop: '-4px', marginInlineEnd: '14px' },
  { marginTop: '12px', marginInlineStart: '16px' },
  { marginTop: '2px',  marginInlineEnd: '8px' },
  { marginTop: '10px', marginInlineStart: '6px' },
];

// ── Faint neural-network watermark ────────────────────────────────────────────

function NeuralWatermark() {
  const nodes: [number, number][] = [
    [100, 60],  [280, 30],  [500, 80],  [720, 40],  [940, 70],  [1160, 35], [1340, 85],
    [60,  220], [230, 200], [420, 240], [640, 210], [860, 235], [1080, 205],[1300, 230],
    [140, 390], [360, 370], [580, 410], [800, 380], [1020, 400],[1240, 375],
    [80,  550], [300, 530], [520, 570], [740, 545], [960, 560], [1180, 540],[1380, 555],
    [200, 710], [440, 690], [680, 720], [900, 700], [1120, 715],[1340, 695],
  ];

  const edges: [number, number][] = [
    // horizontal rows
    [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],
    [7,8],[8,9],[9,10],[10,11],[11,12],[12,13],
    [14,15],[15,16],[16,17],[17,18],[18,19],
    [20,21],[21,22],[22,23],[23,24],[24,25],[25,26],
    [27,28],[28,29],[29,30],[30,31],
    // vertical connections
    [0,7],[1,8],[2,9],[3,10],[4,11],[5,12],[6,13],
    [7,14],[8,15],[9,16],[10,17],[11,18],[12,19],
    [14,20],[15,21],[16,22],[17,23],[18,24],[19,25],
    [20,27],[21,28],[22,29],[23,30],[24,31],
    // diagonal accents
    [1,9],[3,11],[5,13],[8,16],[10,18],[15,23],[17,25],
  ];

  return (
    <svg
      viewBox="0 0 1440 780"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: '-8%',
        width: '116%',
        height: '116%',
        pointerEvents: 'none',
      }}
    >
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a][0]} y1={nodes[a][1]}
          x2={nodes[b][0]} y2={nodes[b][1]}
          stroke="#DBEAFE"
          strokeWidth="0.9"
          strokeOpacity="0.4"
        />
      ))}
      {nodes.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r="2.5"
          fill="#93C5FD"
          fillOpacity="0.36"
        />
      ))}
    </svg>
  );
}

// ── Landing header ────────────────────────────────────────────────────────────

function LandingHeader() {
  return (
    <header style={{
      borderBottom: 'none',
      background: 'transparent',
      position: 'sticky',
      top: 0,
      zIndex: 30,
    }}>
      <div style={{
        maxWidth: '1920px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        height: 'clamp(56px, 8vw, 80px)',
        padding: '0 clamp(16px, 4vw, 40px)',
      }}>
        <div style={{ background: 'white', lineHeight: 0 }}>
          <img
            src={`${import.meta.env.BASE_URL}hillel-yaffe-logo.png?v=2`}
            alt="הלל יפה"
            className="lp-header-logo"
            style={{
              height: 'clamp(36px, 5vw, 60px)',
              width: 'auto',
              objectFit: 'contain',
              mixBlendMode: 'multiply',
            }}
          />
        </div>
      </div>
    </header>
  );
}

// ── CTA button ────────────────────────────────────────────────────────────────

function CtaButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="lp-cta-btn"
      onClick={onClick}
    >
      <span>כניסה למערכת</span>
    </button>
  );
}

// ── Main LandingPage ──────────────────────────────────────────────────────────

export function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <>
      <style>{`
        @keyframes lp-fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lp-fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes lp-glowPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.75; }
          50%       { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
        }
        @keyframes lp-chipDrift {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-4px); }
        }
        @keyframes lp-chipSheen {
          0%   { transform: translateX(-160%); opacity: 0; }
          18%  { opacity: 0.5; }
          42%  { transform: translateX(160%); opacity: 0; }
          100% { transform: translateX(160%); opacity: 0; }
        }

        .lp-title   { animation: lp-fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.06s both; }
        .lp-sub     { animation: lp-fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.14s both; }
        .lp-cta     { animation: lp-fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.22s both; }
        .lp-cluster { animation: lp-fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.32s both; }
        .lp-glow    { animation: lp-glowPulse 6s ease-in-out infinite; }

        /* ── CTA button ── */
        .lp-cta-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 280px;
          min-height: 52px;
          padding: 0 32px;
          border-radius: 999px;
          border: none;
          background: #2563EB;
          color: #FFFFFF;
          font-size: clamp(15px, 2vw, 17px);
          font-weight: 700;
          font-family: 'Assistant', 'Heebo', Arial, sans-serif;
          letter-spacing: -0.02em;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(37,99,235,0.20);
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        /* Touch press — fires on mobile */
        .lp-cta-btn:active {
          transform: scale(0.96) !important;
          background: #1E40AF !important;
          box-shadow: 0 4px 10px rgba(37,99,235,0.14) !important;
          transition: transform 0.08s ease, background 0.08s ease !important;
        }
        /* Hover — desktop pointer devices only */
        @media (hover: hover) {
          .lp-cta-btn:hover {
            background: #1D4ED8;
            transform: translateY(-2px);
            box-shadow: 0 14px 28px rgba(37,99,235,0.26);
          }
        }

        /* ── Chips ── */
        .lp-chip-shell {
          display: flex;
          justify-content: center;
          animation: lp-chipDrift 5.6s ease-in-out infinite;
          will-change: transform;
          /* Zero out desktop stagger offsets on mobile */
          margin: 0 !important;
        }
        @media (min-width: 640px) {
          .lp-chip-shell {
            margin: revert !important;
          }
        }
        .lp-chip {
          position: relative;
          overflow: hidden;
          transition: transform 0.22s ease, box-shadow 0.22s ease, filter 0.22s ease;
        }
        .lp-chip::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.55) 45%, transparent 100%);
          transform: translateX(-160%);
          animation: lp-chipSheen 6.8s ease-in-out infinite;
          pointer-events: none;
        }
        /* Touch press on chips */
        .lp-chip:active {
          transform: translateY(-1px) scale(1.02);
          box-shadow: 0 8px 20px rgba(15,23,42,0.10);
          transition: transform 0.08s ease;
        }
        @media (hover: hover) {
          .lp-chip:hover {
            transform: translateY(-2px) scale(1.03);
            box-shadow: 0 12px 28px rgba(15,23,42,0.08);
            filter: saturate(1.05);
          }
        }

        /* ── Prevent horizontal overflow ── */
        .lp-root {
          overflow-x: hidden;
          max-width: 100vw;
        }

        /* ── Mobile: larger header logo ── */
        @media (max-width: 767px) {
          .lp-header-logo {
            height: 72px !important;
          }
        }
      `}</style>

      <div
        className="lp-root"
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, #F8FBFF 0%, #FCFCFD 48%, #F8FBFF 100%)',
          fontFamily: 'Rubik, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <NeuralWatermark />

        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 82% 76% at 50% 46%, rgba(219,234,254,0.30) 0%, transparent 74%)',
        }} />

        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: `
              radial-gradient(circle at 8% 12%, rgba(191,219,254,0.28) 0%, transparent 24%),
              radial-gradient(circle at 92% 14%, rgba(199,210,254,0.22) 0%, transparent 26%),
              radial-gradient(circle at 12% 88%, rgba(224,231,255,0.18) 0%, transparent 24%),
              radial-gradient(circle at 90% 84%, rgba(186,230,253,0.22) 0%, transparent 25%)
            `,
          }}
        />

        {/* ── Header ─────────────────────────────────────────── */}
        <LandingHeader />

        {/* ── Hero ───────────────────────────────────────────── */}
        <main
          dir="rtl"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'clamp(16px, 4vw, 30px) clamp(16px, 5vw, 28px) calc(clamp(32px, 6vw, 54px) + env(safe-area-inset-bottom, 0px))',
            position: 'relative',
            textAlign: 'center',
            overflow: 'visible',
            zIndex: 1,
          }}
        >
          {/* Glow blob — centered behind content */}
          <div
            aria-hidden="true"
            className="lp-glow"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(500px, 90vw)',
              height: 'min(400px, 70vw)',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(191,219,254,0.22) 0%, rgba(255,255,255,0) 68%)',
              filter: 'blur(20px)',
              pointerEvents: 'none',
            }}
          />

          {/* Content stack */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              maxWidth: '700px',
              gap: 0,
            }}
          >
            {/* ── Hero card — title + subtitle + CTA ── */}
            <div
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.72)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border: '1px solid rgba(219, 234, 254, 0.60)',
                borderRadius: 'clamp(16px, 3vw, 24px)',
                boxShadow: '0 4px 24px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)',
                padding: 'clamp(20px, 4vw, 36px) clamp(16px, 4vw, 32px)',
                marginBottom: '16px',
              }}
            >
              <h1
                className="lp-title"
                style={{
                  margin: '0 auto 12px',
                  maxWidth: '560px',
                  fontSize: 'clamp(22px, 5.5vw, 40px)',
                  lineHeight: 1.3,
                  fontWeight: '700',
                  color: '#0F172A',
                  letterSpacing: '-0.24px',
                  fontFamily: 'Assistant, Heebo, Arial, sans-serif',
                }}
              >
                GROW | מייצרים שינוי.
              </h1>

              <p
                className="lp-sub"
                style={{
                  margin: '0 auto 24px',
                  maxWidth: '520px',
                  fontSize: 'clamp(14px, 2.5vw, 19px)',
                  lineHeight: 1.65,
                  fontWeight: '300',
                  color: '#334155',
                  direction: 'rtl',
                  letterSpacing: '-0.12px',
                  fontFamily: 'Assistant, Heebo, Arial, sans-serif',
                  wordBreak: 'keep-all',
                  overflowWrap: 'break-word',
                }}
              >
                המרחב הדיגיטלי לניהול פרויקטים רוחביים לצורך חיזוק המחוברות הארגונית בבית החולים הלל יפה
              </p>

              {/* CTA */}
              <div
                className="lp-cta"
                style={{ display: 'flex', justifyContent: 'center', width: '100%' }}
              >
                <CtaButton onClick={() => setShowLogin(true)} />
              </div>
            </div>

            {/* Divider — signals "action above, context below" */}
            <div aria-hidden="true" style={{
              width: '40px',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(148,163,184,0.35), transparent)',
              marginBottom: '16px',
            }} />

            {/* ── Chips section ── */}
            <div
              className="lp-cluster"
              style={{
                width: '100%',
                padding: 'clamp(14px, 3vw, 20px) clamp(12px, 3vw, 16px)',
                background: 'rgba(248, 251, 255, 0.85)',
                border: '1px solid rgba(219, 234, 254, 0.45)',
                borderRadius: 'clamp(12px, 2vw, 16px)',
              }}
            >
              <p style={{
                fontSize: '11px',
                fontWeight: '600',
                letterSpacing: '0.08em',
                color: '#94A3B8',
                textTransform: 'uppercase',
                margin: '0 0 10px 0',
                textAlign: 'center',
                fontFamily: 'Assistant, Heebo, Arial, sans-serif',
              }}>
                תחומי הפרויקט
              </p>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '8px 10px',
              }}>
                {CATEGORIES.map((cat, i) => (
                  <div
                    key={i}
                    className="lp-chip-shell"
                    style={{
                      ...CHIP_CLUSTER_OFFSETS[i],
                      animationDelay: `${i * 0.28}s`,
                      animationDuration: `${5.2 + (i % 3) * 0.65}s`,
                    }}
                  >
                    <div className="lp-chip" style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '36px',
                      padding: '6px 14px',
                      borderRadius: '100px',
                      fontSize: 'clamp(12px, 1.8vw, 13px)',
                      fontWeight: '400',
                      textAlign: 'center',
                      color: cat.text,
                      background: `${cat.bg}E6`,
                      border: `1px solid ${cat.text}2E`,
                      boxShadow: '0 4px 12px rgba(15,23,42,0.04)',
                      whiteSpace: 'normal',
                      wordBreak: 'keep-all',
                      cursor: 'default',
                    }}>
                      {cat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </main>
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
