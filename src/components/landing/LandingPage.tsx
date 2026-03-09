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

// Organic cluster — two rows, middle row offset
const CHIP_POSITIONS: React.CSSProperties[] = [
  // Row 1 — 3 chips
  { top: 0,    left: '1%'  },
  { top: 0,    left: '26%' },
  { top: 0,    left: '58%' },
  // Row 2 — 3 chips, offset
  { top: 56,   left: '13%' },
  { top: 56,   left: '44%' },
  { top: 56,   left: '70%' },
  // Row 3 — 1 chip, centered
  { top: 112,  left: '35%' },
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
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
      }}
    >
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a][0]} y1={nodes[a][1]}
          x2={nodes[b][0]} y2={nodes[b][1]}
          stroke="#D1D5DB"
          strokeWidth="0.9"
          strokeOpacity="0.7"
        />
      ))}
      {nodes.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r="2.5"
          fill="#9CA3AF"
          fillOpacity="0.5"
        />
      ))}
    </svg>
  );
}

// ── Landing header — matches App header appearance exactly ────────────────────

function LandingHeader() {
  return (
    <header style={{
      borderBottom: '1px solid #e2e8f0',
      background: '#ffffff',
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
          backgroundColor: '#ffffff',
          height: '80px',
          padding: '0 32px',
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
          gap: '10px',
          direction: 'rtl',
        }}>
          <img
            src={`${import.meta.env.BASE_URL}hillel-yaffe-logo.png?v=2`}
            alt="הלל יפה"
            style={{ height: '52px', width: 'auto', objectFit: 'contain' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{
              fontWeight: '800',
              color: '#000000',
              letterSpacing: '-0.5px',
              fontFamily: 'Rubik, sans-serif',
              fontSize: '24px',
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}>
              GROW
            </span>
            <span style={{
              color: '#1a1a1a',
              fontSize: '12px',
              fontWeight: '500',
              fontFamily: 'Rubik, sans-serif',
              whiteSpace: 'nowrap',
              marginTop: '2px',
            }}>
              פיתוח וחיזוק מחוברות ארגונית
            </span>
          </div>
        </div>

      </div>
    </header>
  );
}

// ── CTA button — solid primary blue ──────────────────────────────────────────

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
        gap: '10px',
        padding: '15px 44px',
        borderRadius: '12px',
        border: 'none',
        background: hovered ? '#2563EB' : '#3B82F6',
        color: '#ffffff',
        fontSize: '17px',
        fontWeight: '700',
        fontFamily: 'Rubik, sans-serif',
        letterSpacing: '-0.2px',
        cursor: 'pointer',
        boxShadow: hovered
          ? '0 8px 28px rgba(59,130,246,0.45), 0 2px 8px rgba(59,130,246,0.2)'
          : '0 4px 16px rgba(59,130,246,0.3), 0 1px 4px rgba(59,130,246,0.15)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.18s ease',
        direction: 'rtl',
      }}
    >
      <span>כניסה למרכז הפיקוד</span>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </button>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function LandingFooter() {
  return (
    <footer
      dir="rtl"
      style={{
        borderTop: '1px solid #e2e8f0',
        background: '#ffffff',
        padding: '20px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}
    >
      {/* Right: logo mark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: 28, height: 28, borderRadius: '7px',
          background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: '800', color: 'white',
        }}>G+</div>
        <span style={{ color: '#374151', fontWeight: '600', fontSize: '14px', fontFamily: 'Rubik, sans-serif' }}>
          GROW+
        </span>
      </div>

      {/* Center: links */}
      <div style={{ display: 'flex', gap: '28px' }}>
        {['תנאי שימוש', 'מדיניות פרטיות', 'צור קשר'].map((link) => (
          <span
            key={link}
            style={{ fontSize: '13px', color: '#9CA3AF', cursor: 'pointer', transition: 'color 0.15s', fontFamily: 'Rubik, sans-serif' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#374151'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#9CA3AF'; }}
          >
            {link}
          </span>
        ))}
      </div>

      {/* Left: copyright */}
      <span style={{ fontSize: '13px', color: '#D1D5DB', fontFamily: 'Rubik, sans-serif', direction: 'ltr' }}>
        © 2024 GROW+
      </span>
    </footer>
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
        @keyframes lp-chipFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-5px); }
        }
        .lp-sub      { animation: lp-fadeUp  0.6s cubic-bezier(0.16,1,0.3,1) 0.08s both; }
        .lp-cluster  { animation: lp-fadeUp  0.6s cubic-bezier(0.16,1,0.3,1) 0.30s both; }
        .lp-cta      { animation: lp-fadeUp  0.6s cubic-bezier(0.16,1,0.3,1) 0.44s both; }
        .lp-cf0 { animation: lp-chipFloat 4.0s ease-in-out infinite 0.0s; }
        .lp-cf1 { animation: lp-chipFloat 4.5s ease-in-out infinite 0.7s; }
        .lp-cf2 { animation: lp-chipFloat 3.8s ease-in-out infinite 1.3s; }
        .lp-cf3 { animation: lp-chipFloat 4.3s ease-in-out infinite 0.4s; }
        .lp-cf4 { animation: lp-chipFloat 4.7s ease-in-out infinite 1.0s; }
        .lp-cf5 { animation: lp-chipFloat 3.6s ease-in-out infinite 1.6s; }
        .lp-cf6 { animation: lp-chipFloat 4.9s ease-in-out infinite 0.2s; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#FCFCFD',
        fontFamily: 'Rubik, sans-serif',
      }}>

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
            padding: '72px 24px 96px',
            position: 'relative',
            textAlign: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Faint neural network watermark */}
          <NeuralWatermark />

          {/* Very subtle gradient tints behind the text */}
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(219,234,254,0.35) 0%, transparent 70%)',
          }} />

          {/* Content — above watermark */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            {/* Mission statement — the sole main text */}
            <p
              className="lp-sub"
              style={{
                margin: '0 auto 52px',
                maxWidth: '620px',
                fontSize: 'clamp(18px, 2.2vw, 26px)',
                fontWeight: '500',
                lineHeight: '1.65',
                color: '#1E3A5F',
                direction: 'rtl',
                letterSpacing: '-0.2px',
              }}
            >
              המרחב הדיגיטלי לניהול יוזמות רוחביות, טיפוח מצוינות וחיזוק המחוברות הארגונית בבית החולים
            </p>

            {/* Constellation cluster */}
            <div
              className="lp-cluster"
              style={{
                position: 'relative',
                width: '700px',
                maxWidth: '96vw',
                height: '168px',
                marginBottom: '60px',
              }}
            >
              {CATEGORIES.map((cat, i) => (
                <div
                  key={i}
                  className={`lp-cf${i}`}
                  style={{ position: 'absolute', ...CHIP_POSITIONS[i] }}
                >
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '8px 18px',
                    borderRadius: '100px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: cat.text,
                    background: cat.bg,
                    border: `1.5px solid ${cat.text}22`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    whiteSpace: 'nowrap',
                    cursor: 'default',
                  }}>
                    {cat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="lp-cta">
              <CtaButton onClick={() => setShowLogin(true)} />
            </div>

          </div>
        </main>

        {/* ── Footer ─────────────────────────────────────────── */}
        <LandingFooter />
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
