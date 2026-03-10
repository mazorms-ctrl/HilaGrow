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

// ── Landing header — matches App header appearance exactly ────────────────────

function LandingHeader() {
  return (
    <header style={{
      borderBottom: 'none',
      background: 'transparent',
      position: 'sticky',
      top: 0,
      zIndex: 30,
    }}>
      <div
        style={{
          maxWidth: '1920px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          direction: 'rtl',
          position: 'relative',
          backgroundColor: 'transparent',
          height: '98px',
          padding: '0 40px',
        }}
      >
        {/* Logo — centered, same as App */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          alignItems: 'center',
          direction: 'rtl',
        }}>
          <img
            src={`${import.meta.env.BASE_URL}hillel-yaffe-logo.png?v=2`}
            alt="הלל יפה"
            style={{ height: '80px', width: 'auto', objectFit: 'contain' }}
          />
        </div>

      </div>
    </header>
  );
}

// ── CTA button ────────────────────────────────────────────────────────────────

function CtaButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 36px',
        minHeight: '54px',
        borderRadius: '999px',
        border: 'none',
        background: hovered ? '#1D4ED8' : '#2563EB',
        color: '#FFFFFF',
        fontSize: '16px',
        fontWeight: '700',
        fontFamily: 'Assistant, Heebo, Arial, sans-serif',
        letterSpacing: '-0.02em',
        cursor: 'pointer',
        boxShadow: hovered
          ? '0 14px 28px rgba(37,99,235,0.22)'
          : '0 8px 18px rgba(37,99,235,0.16)',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        transition: 'all 0.18s ease',
        direction: 'rtl',
      }}
    >
      <span>כניסה</span>
    </button>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

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
          0%, 100% { transform: scale(1); opacity: 0.75; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        @keyframes lp-chipDrift {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes lp-chipSheen {
          0% { transform: translateX(-160%); opacity: 0; }
          18% { opacity: 0.5; }
          42% { transform: translateX(160%); opacity: 0; }
          100% { transform: translateX(160%); opacity: 0; }
        }
        .lp-title    { animation: lp-fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.06s both; }
        .lp-sub      { animation: lp-fadeUp  0.6s cubic-bezier(0.16,1,0.3,1) 0.08s both; }
        .lp-cta      { animation: lp-fadeUp  0.6s cubic-bezier(0.16,1,0.3,1) 0.22s both; }
        .lp-cluster  { animation: lp-fadeUp  0.6s cubic-bezier(0.16,1,0.3,1) 0.38s both; }
        .lp-glow     { animation: lp-glowPulse 6s ease-in-out infinite; }
        .lp-chip-shell {
          display: flex;
          justify-content: center;
          animation: lp-chipDrift 5.6s ease-in-out infinite;
          will-change: transform;
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
        .lp-chip:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 12px 28px rgba(15,23,42,0.08);
          filter: saturate(1.05);
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #F8FBFF 0%, #FCFCFD 48%, #F8FBFF 100%)',
        fontFamily: 'Rubik, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}>
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
            padding: '30px 28px 54px',
            position: 'relative',
            textAlign: 'center',
            overflow: 'visible',
            zIndex: 1,
          }}
        >
          <div
            aria-hidden="true"
            className="lp-glow"
            style={{
              position: 'absolute',
              top: '20%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'min(640px, 72vw)',
              height: 'min(640px, 72vw)',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(191,219,254,0.28) 0%, rgba(255,255,255,0) 72%)',
              filter: 'blur(10px)',
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
              maxWidth: '1040px',
              gap: 0,
            }}
          >
            <h1
              className="lp-title"
              style={{
                margin: '0 auto 18px',
                maxWidth: '760px',
                fontSize: 'clamp(29px, 3.4vw, 40px)',
                lineHeight: 1.35,
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
                margin: '0 auto 46px',
                maxWidth: '820px',
                fontSize: 'clamp(17px, 2vw, 22px)',
                lineHeight: 1.75,
                fontWeight: '300',
                color: '#334155',
                direction: 'rtl',
                letterSpacing: '-0.12px',
                fontFamily: 'Assistant, Heebo, Arial, sans-serif',
              }}
            >
              המרחב הדיגיטלי לניהול פרויקטים רוחביים לצורך חיזוק המחוברות הארגונית בבית החולים הלל יפה
            </p>

            {/* 2 — CTA button */}
            <div className="lp-cta" style={{ marginBottom: '64px' }}>
              <CtaButton onClick={() => setShowLogin(true)} />
            </div>

            {/* 3 — Chips cluster */}
            <div
              className="lp-cluster"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '10px 18px',
                width: '100%',
                maxWidth: '820px',
                padding: '12px 8px 0',
              }}
            >
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
                    minHeight: '40px',
                    padding: '8px 18px',
                    borderRadius: '100px',
                    fontSize: '13px',
                    fontWeight: '400',
                    textAlign: 'center',
                    color: cat.text,
                    background: `${cat.bg}E6`,
                    border: `1px solid ${cat.text}2E`,
                    boxShadow: '0 6px 16px rgba(15,23,42,0.04)',
                    whiteSpace: 'nowrap',
                    cursor: 'default',
                  }}>
                    {cat.label}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </main>
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
