import { useState } from 'react';
import { LoginModal } from '@/components/auth/LoginModal';

// ── Category constellation data ───────────────────────────────────────────────

const CATEGORIES = [
  { label: 'העצמת הרגשת הערכה',       bg: '#BAE6FD', text: '#075985' },
  { label: 'פיתוח מתמחים',             bg: '#FEF08A', text: '#713F12' },
  { label: 'פיתוח רופאים בכירים',      bg: '#FBCFE8', text: '#831843' },
  { label: 'פרסום פנים ארגוני',        bg: '#F9A8D4', text: '#9D174D' },
  { label: 'שיפור תשתיות ורווחה',     bg: '#D9F99D', text: '#365314' },
  { label: 'תוכניות התפתחות כלליות',  bg: '#A5F3FC', text: '#164E63' },
  { label: 'מחקר',                     bg: '#C7D2FE', text: '#312E81' },
] as const;

// ── Chip positions (% offsets within constellation container) ─────────────────
// 7 chips arranged in an organic, non-grid cluster
const CHIP_POSITIONS = [
  { top: '0%',   left: '0%'   },  // top-left
  { top: '-16px', left: '28%' },  // top-center-left
  { top: '0%',   left: '56%'  },  // top-center-right
  { top: '52px', left: '14%'  },  // mid-left
  { top: '48px', left: '42%'  },  // mid-center
  { top: '44px', left: '68%'  },  // mid-right
  { top: '100px', left: '30%' },  // bottom-center
];

// ── SVG neural-network background ────────────────────────────────────────────

function NeuralBackground() {
  // Node positions as [cx%, cy%] of the SVG viewBox (1440×900)
  const nodes = [
    [120, 80], [320, 50], [580, 120], [820, 60], [1050, 90], [1280, 70], [1380, 200],
    [80,  280], [260, 320], [500, 260], [700, 310], [950, 270], [1180, 300], [1350, 380],
    [150, 520], [400, 480], [660, 550], [880, 500], [1100, 540], [1300, 510],
    [50,  720], [280, 760], [540, 700], [800, 740], [1020, 710], [1240, 760], [1420, 680],
    [200, 860], [480, 840], [750, 870], [1000, 850], [1350, 820],
  ];

  // Edges: pairs of node indices
  const edges = [
    [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],
    [0,7],[1,8],[2,9],[3,10],[4,11],[5,12],[6,13],
    [7,8],[8,9],[9,10],[10,11],[11,12],[12,13],
    [7,14],[9,15],[11,16],[13,17],
    [14,15],[15,16],[16,17],[17,18],[18,19],
    [14,20],[15,21],[16,22],[17,23],[18,24],[19,25],
    [20,21],[21,22],[22,23],[23,24],[24,25],[25,26],
    [21,27],[22,28],[23,29],[24,30],[25,31],
    [27,28],[28,29],[29,30],[30,31],
    [0,2],[1,3],[8,10],[9,11],[15,17],[22,24],
  ];

  return (
    <svg
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        opacity: 0.18, pointerEvents: 'none',
      }}
    >
      <defs>
        <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="1" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
        </radialGradient>
        <style>{`
          @keyframes nodePulse {
            0%, 100% { opacity: 0.5; r: 2.5; }
            50%       { opacity: 1;   r: 4;   }
          }
          @keyframes nodePulse2 {
            0%, 100% { opacity: 0.3; r: 2; }
            50%       { opacity: 0.9; r: 3.5; }
          }
          .n1 { animation: nodePulse  3.2s ease-in-out infinite; }
          .n2 { animation: nodePulse2 4.1s ease-in-out infinite 0.8s; }
          .n3 { animation: nodePulse  5s   ease-in-out infinite 1.6s; }
        `}</style>
      </defs>

      {/* Edges */}
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a][0]} y1={nodes[a][1]}
          x2={nodes[b][0]} y2={nodes[b][1]}
          stroke="#7DD3FC"
          strokeWidth="0.8"
          strokeOpacity="0.6"
        />
      ))}

      {/* Nodes */}
      {nodes.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx} cy={cy}
          r="2.5"
          fill="#38BDF8"
          className={i % 3 === 0 ? 'n1' : i % 3 === 1 ? 'n2' : 'n3'}
        />
      ))}

      {/* Larger accent circles */}
      <circle cx="320" cy="50"  r="8" fill="none" stroke="#7DD3FC" strokeWidth="1" strokeOpacity="0.4" />
      <circle cx="880" cy="500" r="10" fill="none" stroke="#38BDF8" strokeWidth="1" strokeOpacity="0.3" />
      <circle cx="1280" cy="70" r="6"  fill="none" stroke="#BAE6FD" strokeWidth="1" strokeOpacity="0.4" />
    </svg>
  );
}

// ── Geometric accent shapes ───────────────────────────────────────────────────

function GeometricAccents() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* Large ring — top left */}
      <div style={{
        position: 'absolute', top: '-120px', left: '-120px',
        width: '480px', height: '480px', borderRadius: '50%',
        border: '1px solid rgba(56,189,248,0.12)',
      }} />
      <div style={{
        position: 'absolute', top: '-60px', left: '-60px',
        width: '360px', height: '360px', borderRadius: '50%',
        border: '1px solid rgba(56,189,248,0.08)',
      }} />

      {/* Large ring — bottom right */}
      <div style={{
        position: 'absolute', bottom: '-160px', right: '-160px',
        width: '560px', height: '560px', borderRadius: '50%',
        border: '1px solid rgba(14,165,233,0.10)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-80px', right: '-80px',
        width: '400px', height: '400px', borderRadius: '50%',
        border: '1px solid rgba(14,165,233,0.07)',
      }} />

      {/* Faint teal gradient blob — top right */}
      <div style={{
        position: 'absolute', top: '-80px', right: '10%',
        width: '360px', height: '360px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)',
      }} />

      {/* Faint indigo blob — bottom left */}
      <div style={{
        position: 'absolute', bottom: '5%', left: '5%',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)',
      }} />
    </div>
  );
}

// ── CTA Button ────────────────────────────────────────────────────────────────

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
        padding: '16px 44px',
        borderRadius: '100px',
        border: `1px solid rgba(255,255,255,${hovered ? '0.4' : '0.25'})`,
        background: hovered
          ? 'rgba(14,165,233,0.35)'
          : 'rgba(255,255,255,0.12)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        color: '#FFFFFF',
        fontSize: '18px',
        fontWeight: '700',
        fontFamily: 'Rubik, sans-serif',
        letterSpacing: '-0.2px',
        cursor: 'pointer',
        boxShadow: hovered
          ? '0 12px 40px rgba(14,165,233,0.45), inset 0 1px 0 rgba(255,255,255,0.25)'
          : '0 8px 32px rgba(14,165,233,0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
        transform: hovered ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
        transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        direction: 'rtl',
      }}
    >
      <span>כניסה למרכז הפיקוד</span>
      {/* Arrow icon */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </button>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer
      dir="rtl"
      style={{
        position: 'relative', zIndex: 1,
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '20px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.2)',
        backdropFilter: 'blur(10px)',
        flexShrink: 0,
      }}
    >
      {/* Right: Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '8px',
          background: 'linear-gradient(135deg, #0EA5E9 0%, #6366F1 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: '800', color: 'white',
        }}>
          G+
        </div>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '600', fontSize: '14px' }}>
          GROW+
        </span>
      </div>

      {/* Center: Links */}
      <div style={{ display: 'flex', gap: '28px' }}>
        {['תנאי שימוש', 'מדיניות פרטיות', 'צור קשר'].map((link) => (
          <span
            key={link}
            style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.45)',
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'; }}
          >
            {link}
          </span>
        ))}
      </div>

      {/* Left: Copyright */}
      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', direction: 'ltr' }}>
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
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800;900&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes chipFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }

        .landing-hero-title {
          animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both;
        }
        .landing-hero-sub {
          animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.15s both;
        }
        .landing-constellation {
          animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.28s both;
        }
        .landing-cta {
          animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.42s both;
        }
        .chip-float-0 { animation: chipFloat 4.0s ease-in-out infinite 0.0s; }
        .chip-float-1 { animation: chipFloat 4.4s ease-in-out infinite 0.6s; }
        .chip-float-2 { animation: chipFloat 3.8s ease-in-out infinite 1.2s; }
        .chip-float-3 { animation: chipFloat 4.2s ease-in-out infinite 0.3s; }
        .chip-float-4 { animation: chipFloat 4.6s ease-in-out infinite 0.9s; }
        .chip-float-5 { animation: chipFloat 3.6s ease-in-out infinite 1.5s; }
        .chip-float-6 { animation: chipFloat 4.8s ease-in-out infinite 0.5s; }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(160deg, #0B1628 0%, #0F2A4A 35%, #0A2240 65%, #0D1B38 100%)',
          fontFamily: 'Rubik, sans-serif',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Animated background layers */}
        <NeuralBackground />
        <GeometricAccents />

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <header
          style={{
            position: 'relative', zIndex: 10,
            display: 'flex', alignItems: 'center',
            padding: '20px 40px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 38, height: 38, borderRadius: '10px',
              background: 'linear-gradient(135deg, #0EA5E9 0%, #6366F1 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', fontWeight: '800', color: 'white',
              boxShadow: '0 4px 16px rgba(14,165,233,0.4)',
            }}>
              G+
            </div>
            <span style={{
              fontSize: '20px', fontWeight: '800',
              color: 'white', letterSpacing: '-0.5px',
            }}>
              GROW+
            </span>
          </div>
        </header>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <main
          dir="rtl"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 24px 80px',
            position: 'relative', zIndex: 1,
            textAlign: 'center',
          }}
        >
          {/* Subtitle badge */}
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '6px 18px', borderRadius: '100px', marginBottom: '28px',
              background: 'rgba(14,165,233,0.15)',
              border: '1px solid rgba(14,165,233,0.3)',
              animation: 'fadeIn 0.5s ease both',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#38BDF8', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#7DD3FC', letterSpacing: '0.3px' }}>
              פלטפורמה לניהול יוזמות רוחביות
            </span>
          </div>

          {/* H1 */}
          <h1
            className="landing-hero-title"
            style={{
              margin: '0 0 20px',
              fontSize: 'clamp(36px, 6vw, 72px)',
              fontWeight: '900',
              lineHeight: '1.1',
              letterSpacing: '-2px',
              color: 'white',
              direction: 'rtl',
            }}
          >
            GROW
            <span style={{
              background: 'linear-gradient(135deg, #38BDF8 0%, #818CF8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>+</span>
            {' '}|{' '}מובילים שינוי. יחד.
          </h1>

          {/* Subtitle */}
          <p
            className="landing-hero-sub"
            style={{
              margin: '0 auto 52px',
              maxWidth: '640px',
              fontSize: 'clamp(15px, 2vw, 18px)',
              fontWeight: '400',
              lineHeight: '1.7',
              color: 'rgba(186,230,253,0.75)',
              direction: 'rtl',
            }}
          >
            המרחב הדיגיטלי לניהול יוזמות רוחביות, טיפוח מצוינות וחיזוק המחוברות הארגונית בבית החולים
          </p>

          {/* Constellation cluster */}
          <div
            className="landing-constellation"
            style={{
              position: 'relative',
              width: '680px',
              maxWidth: '100%',
              height: '160px',
              marginBottom: '60px',
            }}
          >
            {CATEGORIES.map((cat, i) => (
              <div key={i} className={`chip-float-${i}`} style={{ position: 'absolute', ...CHIP_POSITIONS[i] }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '8px 18px',
                    borderRadius: '100px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: cat.text,
                    background: `${cat.bg}E8`,
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${cat.bg}`,
                    boxShadow: `0 4px 16px rgba(0,0,0,0.2), 0 0 0 1px ${cat.bg}40`,
                    whiteSpace: 'nowrap',
                    cursor: 'default',
                  }}
                >
                  {cat.label}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="landing-cta">
            <CtaButton onClick={() => setShowLogin(true)} />
          </div>
        </main>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <Footer />
      </div>

      {/* Login modal */}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
