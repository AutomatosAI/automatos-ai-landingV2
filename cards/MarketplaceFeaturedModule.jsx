// Concept 2: Module Bench — featured tile in a glowing PCB / circuit-board lattice.
// Traces light up sequentially; small terminals at edges; subtle scanlines; ports pulse.
const MarketplaceFeaturedModule = () => {
  // Trace paths (PCB-style orthogonal). Each is a segment that animates a light packet.
  const traces = [
    // entering from left
    { d: "M0 90 L 220 90 L 240 110 L 320 110", dur: 4.2, delay: 0.0 },
    { d: "M0 150 L 280 150 L 300 130 L 320 130", dur: 4.6, delay: 0.7 },
    { d: "M0 210 L 200 210 L 220 190 L 320 190", dur: 5.0, delay: 1.4 },
    // exiting right
    { d: "M540 110 L 620 110 L 640 130 L 880 130", dur: 4.4, delay: 0.3 },
    { d: "M540 150 L 700 150 L 720 170 L 880 170", dur: 5.2, delay: 1.0 },
    { d: "M540 200 L 600 200 L 620 220 L 880 220", dur: 4.8, delay: 1.7 },
  ];
  // Terminals
  const leftTerms = [90, 150, 210];
  const rightTerms = [130, 170, 220];

  return (
    <div style={mmStyles.card}>
      <div style={mmStyles.visualWrap}>
        <svg viewBox="0 0 880 300" style={mmStyles.svg} preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="mmBg" cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor="#1a120c" stopOpacity="0.55" />
              <stop offset="80%" stopColor="#0a0a0e" stopOpacity="0" />
            </radialGradient>
            <pattern id="mmGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M20 0 L0 0 0 20" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
            </pattern>
            <linearGradient id="mmTile" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#241a12" />
              <stop offset="100%" stopColor="#0f0d12" />
            </linearGradient>
            <linearGradient id="mmEdge" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.0" />
              <stop offset="50%" stopColor="#fdba74" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
            </linearGradient>
            <filter id="mmGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" />
            </filter>
          </defs>

          <rect width="880" height="300" fill="url(#mmBg)" />
          <rect width="880" height="300" fill="url(#mmGrid)" />

          {/* scanline overlay */}
          <g opacity="0.5">
            {Array.from({length: 7}).map((_, i) => (
              <line key={i}
                x1="0" y1={42 + i * 36} x2="880" y2={42 + i * 36}
                stroke="rgba(253,186,116,0.05)" strokeWidth="1" />
            ))}
          </g>

          {/* base traces */}
          <g fill="none" stroke="rgba(249,115,22,0.20)" strokeWidth="1.3" strokeLinejoin="miter" strokeLinecap="round">
            {traces.map((t, i) => <path key={i} d={t.d} />)}
          </g>
          {/* trace highlight (slightly brighter on segments where packets travel) */}
          <g fill="none" stroke="rgba(253,186,116,0.10)" strokeWidth="2.4" strokeLinejoin="miter" strokeLinecap="round">
            {traces.map((t, i) => <path key={i} d={t.d} />)}
          </g>

          {/* trace solder dots at corners (small joints) */}
          <g fill="#fdba74">
            {[
              [220, 90],[240, 110],[280, 150],[300, 130],[200, 210],[220, 190],
              [620, 110],[640, 130],[700, 150],[720, 170],[600, 200],[620, 220],
            ].map(([x,y], i) => (
              <circle key={i} cx={x} cy={y} r="1.6" opacity="0.55" />
            ))}
          </g>

          {/* light packets traveling along traces */}
          <g>
            {traces.map((t, i) => (
              <g key={i}>
                <circle r="2.4" fill="#fed7aa" filter="url(#mmGlow)">
                  <animateMotion dur={`${t.dur}s`} begin={`${t.delay}s`} repeatCount="indefinite" path={t.d} />
                  <animate attributeName="opacity" values="0;1;1;0" dur={`${t.dur}s`} begin={`${t.delay}s`} repeatCount="indefinite" />
                </circle>
                <circle r="1.4" fill="#fff7ed">
                  <animateMotion dur={`${t.dur}s`} begin={`${t.delay}s`} repeatCount="indefinite" path={t.d} />
                  <animate attributeName="opacity" values="0;1;1;0" dur={`${t.dur}s`} begin={`${t.delay}s`} repeatCount="indefinite" />
                </circle>
              </g>
            ))}
          </g>

          {/* left edge terminals */}
          <g>
            {leftTerms.map((y, i) => (
              <g key={i}>
                <rect x="-2" y={y - 5} width="20" height="10" rx="1.5" fill="#1a120c" stroke="rgba(253,186,116,0.5)" strokeWidth="1" />
                <circle cx="14" cy={y} r="2" fill="#fdba74">
                  <animate attributeName="opacity" values="0.4;1;0.4" dur="2.4s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
                </circle>
              </g>
            ))}
          </g>
          {/* right edge terminals */}
          <g>
            {rightTerms.map((y, i) => (
              <g key={i}>
                <rect x="862" y={y - 5} width="20" height="10" rx="1.5" fill="#1a120c" stroke="rgba(253,186,116,0.5)" strokeWidth="1" />
                <circle cx="866" cy={y} r="2" fill="#fdba74">
                  <animate attributeName="opacity" values="0.4;1;0.4" dur="2.4s" begin={`${0.6 + i * 0.4}s`} repeatCount="indefinite" />
                </circle>
              </g>
            ))}
          </g>

          {/* hero module tile in center */}
          <g transform="translate(430 150)">
            {/* shadow */}
            <rect x="-110" y="-72" width="220" height="148" rx="14" fill="#000" opacity="0.5" filter="url(#mmGlow)" />
            {/* body */}
            <rect x="-110" y="-72" width="220" height="148" rx="14" fill="url(#mmTile)"
              stroke="rgba(253,186,116,0.35)" strokeWidth="1" />
            {/* top edge bright bar */}
            <rect x="-90" y="-72" width="180" height="2" fill="url(#mmEdge)">
              <animate attributeName="opacity" values="0.6;1;0.6" dur="3.2s" repeatCount="indefinite" />
            </rect>
            {/* connector pins along left/right edges of module */}
            <g fill="#fdba74">
              {[-50, -20, 10, 40].map(y => (
                <rect key={`l${y}`} x="-114" y={y - 2} width="6" height="4" rx="1" opacity="0.85" />
              ))}
              {[-50, -20, 10, 40].map(y => (
                <rect key={`r${y}`} x="108" y={y - 2} width="6" height="4" rx="1" opacity="0.85" />
              ))}
            </g>
            {/* glyph: stylized module circuit pattern */}
            <g stroke="#fdba74" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="-46" y="-40" width="92" height="60" rx="3" opacity="0.55" />
              <line x1="-46" y1="-22" x2="46" y2="-22" opacity="0.4" />
              <line x1="-46" y1="-4" x2="46" y2="-4" opacity="0.4" />
              <line x1="-20" y1="-40" x2="-20" y2="20" opacity="0.4" />
              <line x1="20" y1="-40" x2="20" y2="20" opacity="0.4" />
              <circle cx="-20" cy="-22" r="2" fill="#fed7aa" stroke="none" />
              <circle cx="20" cy="-22" r="2" fill="#fed7aa" stroke="none">
                <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="0" cy="-4" r="2" fill="#fed7aa" stroke="none" />
              <circle cx="-20" cy="14" r="2" fill="#fed7aa" stroke="none">
                <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" begin="0.6s" repeatCount="indefinite" />
              </circle>
              <circle cx="20" cy="14" r="2" fill="#fed7aa" stroke="none" />
            </g>
            {/* status LED */}
            <g transform="translate(82, -54)">
              <circle r="3.2" fill="#22c55e" />
              <circle r="6" fill="#22c55e" opacity="0.3" filter="url(#mmGlow)">
                <animate attributeName="opacity" values="0.15;0.5;0.15" dur="2s" repeatCount="indefinite" />
              </circle>
            </g>
          </g>

          {/* incoming pulse rectangles on traces near tile */}
          <g>
            <rect x="320" y="109" width="14" height="2" fill="#fff7ed" rx="1">
              <animate attributeName="opacity" values="0;1;0" dur="2.6s" repeatCount="indefinite" />
            </rect>
            <rect x="540" y="109" width="14" height="2" fill="#fff7ed" rx="1">
              <animate attributeName="opacity" values="0;1;0" dur="2.6s" begin="1.3s" repeatCount="indefinite" />
            </rect>
          </g>
        </svg>

        <div style={mmStyles.overlay}>
          <div style={mmStyles.tagRow}>
            <div style={mmStyles.tag}>
              <span style={mmStyles.tagDot}></span>
              FEATURED
            </div>
            <div style={mmStyles.catPill}>Integration</div>
          </div>
          <h2 style={mmStyles.title}>Inbox Triage Module</h2>
          <p style={mmStyles.body}>
            Slot it in. Triages, drafts, and routes mail across every connected workspace.
          </p>
          <div style={mmStyles.metaRow}>
            <span style={mmStyles.metaAuthor}>by gerard@automatos.app</span>
            <span style={mmStyles.metaDot}>·</span>
            <span style={mmStyles.metaItem}>v0.9.4</span>
            <span style={mmStyles.metaDot}>·</span>
            <span style={mmStyles.metaItem}>3,047 installs</span>
            <span style={mmStyles.metaDot}>·</span>
            <span style={mmStyles.metaStar}>★ 4.7</span>
          </div>
        </div>

        <div style={mmStyles.ctaWrap}>
          <button style={mmStyles.cta}>
            Install
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2V10M7 10L3 6M7 10L11 6M2 12H12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const mmStyles = {
  card: {
    width: 1100, height: 300,
    background: 'linear-gradient(135deg, #110e0c 0%, #0e0d12 60%, #0a0a0e 100%)',
    border: '1px solid rgba(249,115,22,0.18)',
    borderRadius: 16,
    overflow: 'hidden',
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#e5e7eb',
    position: 'relative',
    boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 48px rgba(0,0,0,0.45)',
  },
  visualWrap: { position: 'relative', width: '100%', height: '100%', overflow: 'hidden' },
  svg: { width: '100%', height: '100%', display: 'block' },
  overlay: {
    position: 'absolute', left: 32, bottom: 28, right: 220,
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  tagRow: { display: 'flex', alignItems: 'center', gap: 10 },
  tag: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 10, letterSpacing: 1.2,
    color: '#fdba74',
    padding: '4px 8px',
    border: '1px solid rgba(249,115,22,0.28)',
    borderRadius: 4,
    background: 'rgba(249,115,22,0.06)',
  },
  tagDot: { width: 4, height: 4, borderRadius: 999, background: '#f97316', boxShadow: '0 0 6px #f97316' },
  catPill: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 10, letterSpacing: 0.8,
    color: '#cbd5e1',
    padding: '4px 9px',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 999,
    background: 'rgba(20,17,15,0.6)',
    backdropFilter: 'blur(6px)',
  },
  title: { fontSize: 30, fontWeight: 600, letterSpacing: -0.5, margin: 0, color: '#f9fafb' },
  body: { fontSize: 13.5, lineHeight: 1.5, color: '#9ca3af', margin: 0, maxWidth: 540, textWrap: 'pretty' },
  metaRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 10.5,
    color: '#94a3b8', marginTop: 2,
  },
  metaAuthor: { color: '#cbd5e1' },
  metaItem: {},
  metaDot: { color: '#475569' },
  metaStar: { color: '#fdba74' },
  ctaWrap: { position: 'absolute', right: 32, bottom: 28 },
  cta: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '12px 18px',
    background: 'linear-gradient(180deg, #f97316 0%, #ea580c 100%)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    fontSize: 13, fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 8px 20px rgba(249,115,22,0.35), 0 1px 0 rgba(255,255,255,0.2) inset',
    fontFamily: 'inherit',
  },
};

window.MarketplaceFeaturedModule = MarketplaceFeaturedModule;
