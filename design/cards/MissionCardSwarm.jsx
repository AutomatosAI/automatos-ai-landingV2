// Concept 2: Swarm field — many small particles drifting in a soft vector field, with 6 brighter "lead" agents.
const MissionCardSwarm = () => {
  // Generate a deterministic particle cloud
  const cloud = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = 0; i < 80; i++) {
    cloud.push({
      x: 40 + rnd() * 400,
      y: 40 + rnd() * 240,
      r: 0.6 + rnd() * 1.4,
      d: 4 + rnd() * 6,
      delay: rnd() * 4,
    });
  }
  const leads = [
    { x: 130, y: 160, label: 'R' },
    { x: 200, y: 110, label: 'A' },
    { x: 270, y: 175, label: 'W' },
    { x: 330, y: 100, label: 'C' },
    { x: 360, y: 220, label: 'B' },
    { x: 215, y: 230, label: 'S' },
  ];

  return (
    <div style={swStyles.card}>
      <div style={swStyles.visualWrap}>
        <svg viewBox="0 0 480 320" style={swStyles.svg} preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="swBg" cx="40%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#1a120c" stopOpacity="0.7" />
              <stop offset="55%" stopColor="#0e0d12" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="swStreak" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0" />
              <stop offset="50%" stopColor="#fdba74" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="swLead" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff7ed" stopOpacity="1" />
              <stop offset="50%" stopColor="#fb923c" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#7c2d12" stopOpacity="0" />
            </radialGradient>
            <filter id="swGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>

          <rect width="480" height="320" fill="url(#swBg)" />

          {/* faint vector field flow lines (curves) */}
          <g stroke="rgba(255,255,255,0.05)" fill="none" strokeWidth="1">
            <path d="M0 80  C 120 60, 240 120, 360 100  S 480 90, 520 110" />
            <path d="M0 130 C 120 120, 240 170, 360 150  S 480 140, 520 160" />
            <path d="M0 180 C 120 170, 240 220, 360 200  S 480 190, 520 210" />
            <path d="M0 230 C 120 220, 240 270, 360 250  S 480 240, 520 260" />
          </g>
          <g stroke="rgba(249,115,22,0.10)" fill="none" strokeWidth="1">
            <path d="M0 105 C 120 90, 240 150, 360 130  S 480 120, 520 140" />
            <path d="M0 205 C 120 195, 240 245, 360 225  S 480 215, 520 235" />
          </g>

          {/* drifting particles */}
          <g fill="rgba(253,186,116,0.6)">
            {cloud.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={p.r} opacity={0.25 + (i % 5) * 0.08}>
                <animate attributeName="cx"
                  values={`${p.x};${p.x + p.d};${p.x}`}
                  dur={`${6 + (i % 7)}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
                <animate attributeName="cy"
                  values={`${p.y};${p.y - p.d * 0.6};${p.y}`}
                  dur={`${5 + (i % 6)}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
                <animate attributeName="opacity"
                  values="0.15;0.7;0.15"
                  dur={`${4 + (i % 5)}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </g>

          {/* streaks of activity */}
          <g>
            <rect x="60" y="118" width="80" height="1.2" fill="url(#swStreak)" rx="1">
              <animate attributeName="x" values="40;240;40" dur="6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.9;0" dur="6s" repeatCount="indefinite" />
            </rect>
            <rect x="180" y="200" width="60" height="1" fill="url(#swStreak)" rx="1">
              <animate attributeName="x" values="120;320;120" dur="7s" begin="1.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.8;0" dur="7s" begin="1.2s" repeatCount="indefinite" />
            </rect>
            <rect x="260" y="155" width="70" height="1" fill="url(#swStreak)" rx="1">
              <animate attributeName="x" values="200;380;200" dur="5.5s" begin="0.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.85;0" dur="5.5s" begin="0.6s" repeatCount="indefinite" />
            </rect>
          </g>

          {/* lead agents — labeled chips */}
          <g>
            {leads.map((l, i) => (
              <g key={i}>
                <circle cx={l.x} cy={l.y} r="14" fill="url(#swLead)" opacity="0.55" filter="url(#swGlow)">
                  <animate attributeName="opacity"
                    values="0.3;0.7;0.3" dur={`${3.4 + (i % 3) * 0.7}s`}
                    begin={`${i * 0.4}s`} repeatCount="indefinite" />
                </circle>
                <circle cx={l.x} cy={l.y} r="9" fill="#1a120c" stroke="#fb923c" strokeWidth="1.2" />
                <text x={l.x} y={l.y + 3.2}
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="8.5"
                  fontWeight="700"
                  fill="#fed7aa">{l.label}</text>
              </g>
            ))}
          </g>

          {/* faint connecting whispers between leads (very subtle) */}
          <g stroke="rgba(253,186,116,0.12)" fill="none" strokeWidth="0.6" strokeDasharray="2 4">
            <path d={`M${leads[0].x} ${leads[0].y} L ${leads[1].x} ${leads[1].y}`} />
            <path d={`M${leads[1].x} ${leads[1].y} L ${leads[2].x} ${leads[2].y}`} />
            <path d={`M${leads[2].x} ${leads[2].y} L ${leads[3].x} ${leads[3].y}`} />
            <path d={`M${leads[2].x} ${leads[2].y} L ${leads[4].x} ${leads[4].y}`} />
            <path d={`M${leads[5].x} ${leads[5].y} L ${leads[2].x} ${leads[2].y}`} />
            <path d={`M${leads[0].x} ${leads[0].y} L ${leads[5].x} ${leads[5].y}`} />
          </g>
        </svg>

        <div style={swStyles.livePill}>
          <span style={swStyles.liveDot}></span>
          <span style={swStyles.liveText}>field memory · synced</span>
        </div>
      </div>

      <div style={swStyles.copyCol}>
        <div style={swStyles.tag}>
          <span style={swStyles.tagDot}></span>
          MULTI-AGENT
        </div>
        <h2 style={swStyles.title}>Mission</h2>
        <p style={swStyles.body}>
          Big, complex work. 6–9 agents, field memory, parallel reasoning.
        </p>
        <div style={swStyles.metaRow}>
          <span style={swStyles.metaCount}>06</span>
          <span style={swStyles.metaLabel}>specialists ready</span>
        </div>
        <button style={swStyles.cta}>
          Start
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7H11M11 7L7 3M11 7L7 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

const swStyles = {
  card: {
    width: 760, height: 300,
    display: 'grid',
    gridTemplateColumns: '1fr 280px',
    background: 'linear-gradient(135deg, #110e0c 0%, #0e0d12 60%, #0a0a0e 100%)',
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
    position: 'absolute', top: 16, left: 16,
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
  copyCol: {
    padding: '28px 28px 24px',
    display: 'flex', flexDirection: 'column',
    justifyContent: 'space-between',
  },
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
  metaRow: {
    display: 'flex', alignItems: 'baseline', gap: 8,
    marginTop: 14,
    fontFamily: 'JetBrains Mono, monospace',
  },
  metaCount: { fontSize: 22, color: '#fed7aa', fontWeight: 500, letterSpacing: -0.5 },
  metaLabel: { fontSize: 10.5, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
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

window.MissionCardSwarm = MissionCardSwarm;
