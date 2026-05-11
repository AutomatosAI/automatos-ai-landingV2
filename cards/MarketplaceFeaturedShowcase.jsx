// Concept 1: Showcase / Pedestal — featured item lit on a darkened stage.
// Soft volumetric spotlight cone, slow-pulsing rim light, drifting dust motes.
const MarketplaceFeaturedShowcase = () => {
  // Deterministic dust motes
  const motes = [];
  let s = 11;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < 28; i++) {
    motes.push({
      x: 120 + rnd() * 480,
      y: 220 + rnd() * 100,
      r: 0.6 + rnd() * 1.4,
      dur: 5 + rnd() * 6,
      delay: rnd() * 5,
      drift: 4 + rnd() * 8,
    });
  }

  return (
    <div style={msStyles.card}>
      <div style={msStyles.visualWrap}>
        <svg viewBox="0 0 720 300" style={msStyles.svg} preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="msStageGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#1a120c" stopOpacity="0" />
              <stop offset="60%" stopColor="#1a120c" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0a0a0e" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="msSpot" x1="0.5" x2="0.5" y1="0" y2="1">
              <stop offset="0%" stopColor="#fed7aa" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#fdba74" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="msPool" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fed7aa" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#fb923c" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#7c2d12" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="msTile" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#26201a" />
              <stop offset="100%" stopColor="#14110f" />
            </linearGradient>
            <linearGradient id="msTileEdge" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#fdba74" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.08" />
            </linearGradient>
            <filter id="msGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
            <filter id="msSoft" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" />
            </filter>
          </defs>

          {/* stage backdrop */}
          <rect width="720" height="300" fill="url(#msStageGrad)" />

          {/* spotlight cone */}
          <polygon points="320,0 400,0 540,300 180,300" fill="url(#msSpot)" opacity="0.9">
            <animate attributeName="opacity" values="0.7;1;0.7" dur="6s" repeatCount="indefinite" />
          </polygon>

          {/* floor pool of light */}
          <ellipse cx="360" cy="248" rx="180" ry="22" fill="url(#msPool)">
            <animate attributeName="rx" values="170;195;170" dur="6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;1;0.7" dur="6s" repeatCount="indefinite" />
          </ellipse>

          {/* horizon line */}
          <line x1="0" y1="248" x2="720" y2="248" stroke="rgba(249,115,22,0.18)" strokeWidth="1" />
          <line x1="0" y1="249.5" x2="720" y2="249.5" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

          {/* drifting dust motes (upward) */}
          <g fill="#fed7aa">
            {motes.map((m, i) => (
              <circle key={i} cx={m.x} cy={m.y} r={m.r} opacity="0.5">
                <animate attributeName="cy"
                  values={`${m.y};${m.y - 80 - m.drift * 4};${m.y}`}
                  dur={`${m.dur}s`} begin={`${m.delay}s`} repeatCount="indefinite" />
                <animate attributeName="opacity"
                  values="0;0.7;0"
                  dur={`${m.dur}s`} begin={`${m.delay}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </g>

          {/* rim light behind hero */}
          <g transform="translate(360 168)">
            <circle r="78" fill="#f97316" opacity="0.18" filter="url(#msGlow)">
              <animate attributeName="opacity" values="0.12;0.28;0.12" dur="5s" repeatCount="indefinite" />
            </circle>
            <circle r="56" fill="#fb923c" opacity="0.15" filter="url(#msGlow)">
              <animate attributeName="opacity" values="0.1;0.22;0.1" dur="5s" begin="0.6s" repeatCount="indefinite" />
            </circle>
          </g>

          {/* hero pedestal tile (the featured item icon as a 3D-ish glass tile) */}
          <g transform="translate(360 168)">
            {/* tile base shadow */}
            <ellipse cx="0" cy="78" rx="52" ry="6" fill="#000" opacity="0.55" filter="url(#msSoft)" />
            {/* tile body */}
            <g>
              <rect x="-56" y="-66" width="112" height="132" rx="14" fill="url(#msTile)"
                stroke="rgba(253,186,116,0.35)" strokeWidth="1" />
              {/* top highlight */}
              <rect x="-56" y="-66" width="112" height="2" fill="url(#msTileEdge)" />
              {/* inner glyph: stylized stacked sheets (placeholder for plugin icon) */}
              <g stroke="#fdba74" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <rect x="-26" y="-30" width="48" height="36" rx="3" opacity="0.35" />
                <rect x="-22" y="-22" width="48" height="36" rx="3" opacity="0.6" />
                <rect x="-18" y="-14" width="48" height="36" rx="3" opacity="1">
                  <animate attributeName="opacity" values="0.7;1;0.7" dur="4s" repeatCount="indefinite" />
                </rect>
                {/* lines on top sheet */}
                <line x1="-10" y1="-2" x2="22" y2="-2" stroke="#fed7aa" strokeWidth="1.4" opacity="0.7" />
                <line x1="-10" y1="6"  x2="14" y2="6"  stroke="#fed7aa" strokeWidth="1.4" opacity="0.5" />
                <line x1="-10" y1="14" x2="18" y2="14" stroke="#fed7aa" strokeWidth="1.4" opacity="0.6" />
              </g>
              {/* corner specular */}
              <circle cx="-40" cy="-50" r="4" fill="#fff7ed" opacity="0.55" />
            </g>
          </g>

          {/* drifting horizontal volumetric streaks */}
          <g>
            <rect x="0" y="120" width="80" height="0.8" fill="#fdba74" opacity="0.0" rx="1">
              <animate attributeName="x" values="-100;820" dur="9s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.45;0" dur="9s" repeatCount="indefinite" />
            </rect>
            <rect x="0" y="195" width="60" height="0.7" fill="#fed7aa" opacity="0.0" rx="1">
              <animate attributeName="x" values="-100;820" dur="11s" begin="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.35;0" dur="11s" begin="3s" repeatCount="indefinite" />
            </rect>
          </g>
        </svg>

        {/* overlay copy bottom-left */}
        <div style={msStyles.overlay}>
          <div style={msStyles.tagRow}>
            <div style={msStyles.tag}>
              <span style={msStyles.tagDot}></span>
              FEATURED
            </div>
            <div style={msStyles.catPill}>Productivity</div>
          </div>
          <h2 style={msStyles.title}>Document Workflow Manager</h2>
          <p style={msStyles.body}>
            Route, review, and sign every document your crew touches — without the babysitting.
          </p>
          <div style={msStyles.metaRow}>
            <span style={msStyles.metaAuthor}>Automatos team</span>
            <span style={msStyles.metaDot}>·</span>
            <span style={msStyles.metaItem}>v1.2.0</span>
            <span style={msStyles.metaDot}>·</span>
            <span style={msStyles.metaItem}>1,284 installs</span>
            <span style={msStyles.metaDot}>·</span>
            <span style={msStyles.metaStar}>★ 4.8</span>
          </div>
        </div>

        <div style={msStyles.ctaWrap}>
          <button style={msStyles.cta}>
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

const msStyles = {
  card: {
    width: 1100, height: 300,
    background: 'linear-gradient(135deg, #14110f 0%, #0e0d12 60%, #0a0a0e 100%)',
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
  title: {
    fontSize: 30, fontWeight: 600, letterSpacing: -0.5,
    margin: 0, color: '#f9fafb',
  },
  body: {
    fontSize: 13.5, lineHeight: 1.5,
    color: '#9ca3af',
    margin: 0,
    maxWidth: 540,
    textWrap: 'pretty',
  },
  metaRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 10.5,
    color: '#94a3b8',
    marginTop: 2,
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

window.MarketplaceFeaturedShowcase = MarketplaceFeaturedShowcase;
