// Concept 3: Parallel threads — vertical aurora-like ribbons, each = an agent's stream of thought.
const MissionCardThreads = () => {
  const threads = [
    { x: 60,  hue: '#fdba74', label: 'research', delay: 0,    bursts: [40, 120, 220] },
    { x: 110, hue: '#fb923c', label: 'analyze',  delay: 0.4,  bursts: [60, 180, 250] },
    { x: 160, hue: '#f97316', label: 'plan',     delay: 0.8,  bursts: [30, 140, 240] },
    { x: 210, hue: '#fdba74', label: 'write',    delay: 0.2,  bursts: [80, 170, 270] },
    { x: 260, hue: '#fb923c', label: 'critique', delay: 1.0,  bursts: [50, 150, 220] },
    { x: 310, hue: '#f97316', label: 'build',    delay: 0.6,  bursts: [70, 200, 260] },
    { x: 360, hue: '#fdba74', label: 'verify',   delay: 1.2,  bursts: [40, 130, 230] },
  ];

  return (
    <div style={thStyles.card}>
      <div style={thStyles.visualWrap}>
        <svg viewBox="0 0 440 320" style={thStyles.svg} preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="thLine" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0" />
              <stop offset="35%" stopColor="#f97316" stopOpacity="0.22" />
              <stop offset="65%" stopColor="#f97316" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="thBurst" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#fed7aa" stopOpacity="0" />
              <stop offset="50%" stopColor="#fff7ed" stopOpacity="1" />
              <stop offset="100%" stopColor="#fdba74" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="thBg" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#1a120c" stopOpacity="0.5" />
              <stop offset="80%" stopColor="#0e0d12" stopOpacity="0" />
            </radialGradient>
            <filter id="thGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" />
            </filter>
          </defs>

          <rect width="440" height="320" fill="url(#thBg)" />

          {/* horizon lines (subtle ground) */}
          <g stroke="rgba(255,255,255,0.04)" strokeWidth="1">
            <line x1="0" y1="50"  x2="440" y2="50" />
            <line x1="0" y1="160" x2="440" y2="160" />
            <line x1="0" y1="270" x2="440" y2="270" />
          </g>

          {/* threads */}
          {threads.map((t, i) => (
            <g key={i}>
              {/* base thread line */}
              <line x1={t.x} y1="20" x2={t.x} y2="300" stroke="url(#thLine)" strokeWidth="1.2" />

              {/* small wavering shimmer on the thread */}
              <line x1={t.x} y1="20" x2={t.x} y2="300" stroke={t.hue} strokeWidth="0.5" opacity="0.15" />

              {/* a "head" packet traveling down */}
              <circle cx={t.x} cy="20" r="2.4" fill={t.hue} filter="url(#thGlow)">
                <animate attributeName="cy"
                  values="20;300;20"
                  dur={`${4 + (i % 3) * 0.8}s`}
                  begin={`${t.delay}s`}
                  repeatCount="indefinite" />
                <animate attributeName="opacity"
                  values="0;1;1;0"
                  dur={`${4 + (i % 3) * 0.8}s`}
                  begin={`${t.delay}s`}
                  repeatCount="indefinite" />
              </circle>

              {/* event bursts: tiny horizontal flares at fixed y */}
              {t.bursts.map((y, j) => (
                <g key={j}>
                  <rect x={t.x - 8} y={y - 0.5} width="16" height="1.2" fill={t.hue} opacity="0.6" rx="1">
                    <animate attributeName="opacity"
                      values="0;0.8;0"
                      dur="2.6s"
                      begin={`${t.delay + j * 1.1}s`}
                      repeatCount="indefinite" />
                    <animate attributeName="width"
                      values="4;20;4"
                      dur="2.6s"
                      begin={`${t.delay + j * 1.1}s`}
                      repeatCount="indefinite" />
                    <animate attributeName="x"
                      values={`${t.x - 2};${t.x - 10};${t.x - 2}`}
                      dur="2.6s"
                      begin={`${t.delay + j * 1.1}s`}
                      repeatCount="indefinite" />
                  </rect>
                  <circle cx={t.x} cy={y} r="2" fill={t.hue}>
                    <animate attributeName="r" values="0;3;0" dur="2.6s"
                      begin={`${t.delay + j * 1.1}s`} repeatCount="indefinite" />
                  </circle>
                </g>
              ))}

              {/* label cap at top */}
              <g>
                <rect x={t.x - 22} y="6" width="44" height="10" rx="2" fill="rgba(20,17,15,0.85)" stroke="rgba(255,255,255,0.06)" />
                <text x={t.x} y="13.4"
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="6.5"
                  fill="#94a3b8"
                  letterSpacing="0.5">{t.label.toUpperCase()}</text>
              </g>
            </g>
          ))}

          {/* shared field memory band — horizontal connective tissue */}
          <g>
            <rect x="0" y="155" width="440" height="10" fill="rgba(249,115,22,0.06)" />
            <line x1="0" y1="160" x2="440" y2="160" stroke="rgba(249,115,22,0.35)" strokeWidth="0.6" strokeDasharray="3 4" />
            {/* synchronization pulses traveling sideways */}
            <circle cx="0" cy="160" r="2" fill="#fed7aa" opacity="0.9">
              <animate attributeName="cx" values="-10;460" dur="5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;1;1;0" dur="5s" repeatCount="indefinite" />
            </circle>
            <circle cx="0" cy="160" r="1.5" fill="#fdba74" opacity="0.7">
              <animate attributeName="cx" values="-10;460" dur="6.5s" begin="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.8;0.8;0" dur="6.5s" begin="2s" repeatCount="indefinite" />
            </circle>
            <text x="8" y="152"
              fontFamily="JetBrains Mono, monospace"
              fontSize="6.5"
              fill="#64748b"
              letterSpacing="0.8">SHARED FIELD MEMORY</text>
          </g>
        </svg>

        <div style={thStyles.livePill}>
          <span style={thStyles.liveDot}></span>
          <span style={thStyles.liveText}>7 streams · in parallel</span>
        </div>
      </div>

      <div style={thStyles.copyCol}>
        <div style={thStyles.tag}>
          <span style={thStyles.tagDot}></span>
          MULTI-AGENT
        </div>
        <h2 style={thStyles.title}>Mission</h2>
        <p style={thStyles.body}>
          Big, complex work. 6–9 agents, field memory, parallel reasoning.
        </p>
        <div style={thStyles.bar}>
          <div style={{...thStyles.barCell, opacity: 1}}></div>
          <div style={{...thStyles.barCell, opacity: 0.85}}></div>
          <div style={{...thStyles.barCell, opacity: 0.7}}></div>
          <div style={{...thStyles.barCell, opacity: 0.55}}></div>
          <div style={{...thStyles.barCell, opacity: 0.4}}></div>
          <div style={{...thStyles.barCell, opacity: 0.25, background: '#475569'}}></div>
          <div style={{...thStyles.barCell, opacity: 0.25, background: '#475569'}}></div>
          <span style={thStyles.barLabel}>parallel</span>
        </div>
        <button style={thStyles.cta}>
          Start
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7H11M11 7L7 3M11 7L7 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

const thStyles = {
  card: {
    width: 760, height: 300,
    display: 'grid',
    gridTemplateColumns: '1fr 280px',
    background: 'linear-gradient(135deg, #100d0b 0%, #0d0c11 60%, #0a0a0e 100%)',
    border: '1px solid rgba(249,115,22,0.18)',
    borderRadius: 16,
    overflow: 'hidden',
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#e5e7eb',
    position: 'relative',
    boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 48px rgba(0,0,0,0.45)',
  },
  visualWrap: { position: 'relative', overflow: 'hidden', borderRight: '1px solid rgba(255,255,255,0.04)' },
  svg: { width: '100%', height: '100%', display: 'block' },
  livePill: {
    position: 'absolute', top: 16, right: 16,
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 10px',
    background: 'rgba(20,17,15,0.7)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 999,
    backdropFilter: 'blur(8px)',
    fontSize: 11, letterSpacing: 0.4,
    fontFamily: 'JetBrains Mono, monospace',
    color: '#cbd5e1',
  },
  liveDot: { width: 6, height: 6, borderRadius: 999, background: '#22c55e', boxShadow: '0 0 8px #22c55e' },
  liveText: { textTransform: 'lowercase' },
  copyCol: { padding: '28px 28px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
  tag: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 10, letterSpacing: 1.2,
    color: '#fdba74', width: 'fit-content',
    padding: '4px 8px',
    border: '1px solid rgba(249,115,22,0.28)',
    borderRadius: 4,
    background: 'rgba(249,115,22,0.06)',
  },
  tagDot: { width: 4, height: 4, borderRadius: 999, background: '#f97316', boxShadow: '0 0 6px #f97316' },
  title: { fontSize: 38, fontWeight: 600, letterSpacing: -0.6, margin: '14px 0 8px', color: '#f9fafb' },
  body: { fontSize: 13.5, lineHeight: 1.5, color: '#9ca3af', margin: 0, textWrap: 'pretty' },
  bar: {
    marginTop: 16, display: 'flex', alignItems: 'center', gap: 4,
  },
  barCell: {
    width: 14, height: 14, borderRadius: 2,
    background: '#f97316',
  },
  barLabel: {
    marginLeft: 8,
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 9.5,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cta: {
    marginTop: 18,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '11px 16px',
    background: 'linear-gradient(180deg, #f97316 0%, #ea580c 100%)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    fontSize: 13, fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 8px 20px rgba(249,115,22,0.35), 0 1px 0 rgba(255,255,255,0.2) inset',
    width: 'fit-content',
    fontFamily: 'inherit',
  },
};

window.MissionCardThreads = MissionCardThreads;
