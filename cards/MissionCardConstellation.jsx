// Concept 1: Constellation — agent orbs on faint orbital rings, light pulses traveling between them.
const MissionCardConstellation = () => {
  const orbs = [
    { id: 'a', cx: 180, cy: 110, r: 10, role: 'Researcher' },
    { id: 'b', cx: 260, cy: 70,  r: 8,  role: 'Writer' },
    { id: 'c', cx: 340, cy: 130, r: 9,  role: 'Analyst' },
    { id: 'd', cx: 130, cy: 200, r: 8,  role: 'Critic' },
    { id: 'e', cx: 220, cy: 230, r: 11, role: 'Lead' },
    { id: 'f', cx: 320, cy: 220, r: 8,  role: 'Builder' },
    { id: 'g', cx: 380, cy: 60,  r: 7,  role: 'Scout' },
  ];

  const links = [
    ['a','b'],['b','c'],['a','e'],['c','f'],['d','e'],['e','f'],['b','g'],['c','g'],['a','d']
  ];
  const orbById = Object.fromEntries(orbs.map(o => [o.id, o]));

  return (
    <div style={cstStyles.card}>
      <div style={cstStyles.visualWrap}>
        <svg viewBox="0 0 480 320" style={cstStyles.svg} preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="cstBg" cx="55%" cy="55%" r="65%">
              <stop offset="0%" stopColor="#2a1810" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#0e0d12" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="cstOrb" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fed7aa" stopOpacity="1" />
              <stop offset="55%" stopColor="#f97316" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#7c2d12" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="cstOrbDim" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fde6c8" stopOpacity="0.9" />
              <stop offset="55%" stopColor="#cbd5e1" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#1e293b" stopOpacity="0" />
            </radialGradient>
            <filter id="cstGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" />
            </filter>
          </defs>

          {/* atmospheric glow */}
          <rect width="480" height="320" fill="url(#cstBg)" />

          {/* faint orbital rings */}
          <g stroke="rgba(249,115,22,0.10)" fill="none" strokeWidth="1">
            <ellipse cx="240" cy="160" rx="190" ry="115" />
            <ellipse cx="240" cy="160" rx="135" ry="80" />
            <ellipse cx="240" cy="160" rx="80" ry="48" strokeDasharray="2 4" stroke="rgba(255,255,255,0.07)" />
          </g>

          {/* connection arcs */}
          <g stroke="rgba(249,115,22,0.18)" fill="none" strokeWidth="1">
            {links.map(([a,b], i) => {
              const A = orbById[a], B = orbById[b];
              const mx = (A.cx + B.cx) / 2;
              const my = (A.cy + B.cy) / 2 - 18;
              return (
                <path
                  key={i}
                  d={`M${A.cx} ${A.cy} Q ${mx} ${my} ${B.cx} ${B.cy}`}
                />
              );
            })}
          </g>

          {/* traveling pulses on a couple of arcs */}
          <g fill="#fed7aa">
            <circle r="2.2">
              <animateMotion dur="3.2s" repeatCount="indefinite"
                path={`M${orbById.a.cx} ${orbById.a.cy} Q 220 60 ${orbById.b.cx} ${orbById.b.cy}`} />
              <animate attributeName="opacity" values="0;1;1;0" dur="3.2s" repeatCount="indefinite" />
            </circle>
            <circle r="2" fill="#fdba74">
              <animateMotion dur="4.1s" begin="0.6s" repeatCount="indefinite"
                path={`M${orbById.e.cx} ${orbById.e.cy} Q 280 180 ${orbById.f.cx} ${orbById.f.cy}`} />
              <animate attributeName="opacity" values="0;1;1;0" dur="4.1s" begin="0.6s" repeatCount="indefinite" />
            </circle>
            <circle r="2" fill="#fed7aa">
              <animateMotion dur="3.6s" begin="1.1s" repeatCount="indefinite"
                path={`M${orbById.c.cx} ${orbById.c.cy} Q 340 180 ${orbById.f.cx} ${orbById.f.cy}`} />
              <animate attributeName="opacity" values="0;1;1;0" dur="3.6s" begin="1.1s" repeatCount="indefinite" />
            </circle>
            <circle r="1.8" fill="#a5f3fc" opacity="0.7">
              <animateMotion dur="4.6s" begin="0.3s" repeatCount="indefinite"
                path={`M${orbById.d.cx} ${orbById.d.cy} Q 180 240 ${orbById.e.cx} ${orbById.e.cy}`} />
              <animate attributeName="opacity" values="0;0.9;0.9;0" dur="4.6s" begin="0.3s" repeatCount="indefinite" />
            </circle>
          </g>

          {/* orbs */}
          <g>
            {orbs.map((o, i) => {
              const isLead = o.id === 'e';
              const fill = isLead ? 'url(#cstOrb)' : (i % 2 === 0 ? 'url(#cstOrb)' : 'url(#cstOrbDim)');
              return (
                <g key={o.id}>
                  {/* glow */}
                  <circle cx={o.cx} cy={o.cy} r={o.r * 2.4} fill={fill} opacity="0.35" filter="url(#cstGlow)">
                    <animate attributeName="opacity"
                      values="0.18;0.45;0.18" dur={`${3 + (i % 4) * 0.6}s`}
                      begin={`${i * 0.3}s`} repeatCount="indefinite" />
                  </circle>
                  {/* core */}
                  <circle cx={o.cx} cy={o.cy} r={o.r} fill={fill} />
                  <circle cx={o.cx - o.r * 0.3} cy={o.cy - o.r * 0.3} r={o.r * 0.35} fill="rgba(255,255,255,0.55)" />
                </g>
              );
            })}
          </g>

          {/* faint dust */}
          <g fill="rgba(255,255,255,0.45)">
            {Array.from({ length: 24 }).map((_, i) => {
              const x = (i * 53) % 480;
              const y = (i * 91) % 320;
              return <circle key={i} cx={x} cy={y} r={Math.random() < 0.3 ? 0.9 : 0.5} opacity={0.2 + (i % 5) * 0.06} />;
            })}
          </g>
        </svg>

        {/* live state pill */}
        <div style={cstStyles.livePill}>
          <span style={cstStyles.liveDot}></span>
          <span style={cstStyles.liveText}>3 missions running</span>
        </div>
      </div>

      {/* copy column */}
      <div style={cstStyles.copyCol}>
        <div style={cstStyles.tag}>
          <span style={cstStyles.tagDot}></span>
          MULTI-AGENT
        </div>
        <h2 style={cstStyles.title}>Mission</h2>
        <p style={cstStyles.body}>
          Big, complex work. 6–9 agents, field memory, parallel reasoning.
        </p>
        <div style={cstStyles.metaRow}>
          <span style={cstStyles.meta}>Researcher</span>
          <span style={cstStyles.metaDim}>·</span>
          <span style={cstStyles.meta}>Analyst</span>
          <span style={cstStyles.metaDim}>·</span>
          <span style={cstStyles.meta}>Builder</span>
          <span style={cstStyles.metaDim}>+4</span>
        </div>
        <button style={cstStyles.cta}>
          Start
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7H11M11 7L7 3M11 7L7 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

const cstStyles = {
  card: {
    width: 760, height: 300,
    display: 'grid',
    gridTemplateColumns: '1fr 280px',
    background: 'linear-gradient(135deg, #14110f 0%, #0e0d12 60%, #0c0c10 100%)',
    border: '1px solid rgba(249,115,22,0.18)',
    borderRadius: 16,
    overflow: 'hidden',
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#e5e7eb',
    position: 'relative',
    boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 48px rgba(0,0,0,0.45)',
  },
  visualWrap: {
    position: 'relative',
    overflow: 'hidden',
    borderRight: '1px solid rgba(255,255,255,0.04)',
  },
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
  liveDot: {
    width: 6, height: 6, borderRadius: 999,
    background: '#22c55e',
    boxShadow: '0 0 8px #22c55e',
  },
  liveText: { textTransform: 'lowercase' },
  copyCol: {
    padding: '28px 28px 24px',
    display: 'flex', flexDirection: 'column',
    justifyContent: 'space-between',
    background: 'linear-gradient(180deg, rgba(20,17,15,0) 0%, rgba(20,17,15,0.4) 100%)',
  },
  tag: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 10, letterSpacing: 1.2,
    color: '#fdba74',
    width: 'fit-content',
    padding: '4px 8px',
    border: '1px solid rgba(249,115,22,0.28)',
    borderRadius: 4,
    background: 'rgba(249,115,22,0.06)',
  },
  tagDot: { width: 4, height: 4, borderRadius: 999, background: '#f97316', boxShadow: '0 0 6px #f97316' },
  title: {
    fontSize: 38, fontWeight: 600, letterSpacing: -0.6,
    margin: '14px 0 8px',
    color: '#f9fafb',
  },
  body: {
    fontSize: 13.5, lineHeight: 1.5,
    color: '#9ca3af',
    margin: 0,
    textWrap: 'pretty',
  },
  metaRow: {
    display: 'flex', alignItems: 'center', gap: 6,
    marginTop: 14,
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 10.5,
    color: '#94a3b8',
  },
  meta: {},
  metaDim: { color: '#475569' },
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

window.MissionCardConstellation = MissionCardConstellation;
