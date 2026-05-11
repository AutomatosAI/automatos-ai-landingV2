// Concept 3: Constellation Bundle — featured icon at center, 5–6 satellites on faint
// elliptical rings, light arcs connecting back to the hero. Different scale than Mission:
// one bright center + dim satellites.
const MarketplaceFeaturedBundle = () => {
  // Center = (440, 150). Satellites at varied radii/angles.
  const cx0 = 440, cy0 = 150;
  const sats = [
    { id: 'a', x: 200, y: 90,  r: 11, label: 'CRM' },
    { id: 'b', x: 240, y: 200, r: 10, label: 'Mail' },
    { id: 'c', x: 320, y: 60,  r: 9,  label: 'Cal'  },
    { id: 'd', x: 600, y: 70,  r: 10, label: 'Doc'  },
    { id: 'e', x: 660, y: 200, r: 11, label: 'Task' },
    { id: 'f', x: 540, y: 240, r: 9,  label: 'Slack'},
  ];

  // Deterministic dust
  const dust = [];
  let s = 31;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < 30; i++) {
    dust.push({ x: rnd() * 880, y: rnd() * 300, r: 0.5 + rnd() * 0.9, op: 0.15 + rnd() * 0.3 });
  }

  return (
    <div style={mbStyles.card}>
      <div style={mbStyles.visualWrap}>
        <svg viewBox="0 0 880 300" style={mbStyles.svg} preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="mbBg" cx={`${(cx0/880)*100}%`} cy={`${(cy0/300)*100}%`} r="60%">
              <stop offset="0%" stopColor="#2a1810" stopOpacity="0.55" />
              <stop offset="70%" stopColor="#0e0d12" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="mbHero" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff7ed" stopOpacity="1" />
              <stop offset="55%" stopColor="#fb923c" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#7c2d12" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="mbSat" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fed7aa" stopOpacity="0.9" />
              <stop offset="55%" stopColor="#cbd5e1" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#1e293b" stopOpacity="0" />
            </radialGradient>
            <filter id="mbGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" />
            </filter>
          </defs>

          <rect width="880" height="300" fill="url(#mbBg)" />

          {/* faint elliptical rings around hero */}
          <g stroke="rgba(249,115,22,0.10)" fill="none" strokeWidth="1">
            <ellipse cx={cx0} cy={cy0} rx="280" ry="120" />
            <ellipse cx={cx0} cy={cy0} rx="200" ry="85" />
            <ellipse cx={cx0} cy={cy0} rx="120" ry="50" stroke="rgba(255,255,255,0.07)" strokeDasharray="2 4" />
          </g>

          {/* connection arcs hero -> satellites */}
          <g stroke="rgba(249,115,22,0.18)" fill="none" strokeWidth="1">
            {sats.map((sat, i) => {
              const mx = (cx0 + sat.x) / 2;
              const my = (cy0 + sat.y) / 2 - (i % 2 === 0 ? 22 : -18);
              return <path key={i} d={`M${cx0} ${cy0} Q ${mx} ${my} ${sat.x} ${sat.y}`} />;
            })}
          </g>

          {/* light pulses traveling out from hero (and one returning) */}
          <g>
            {sats.slice(0, 4).map((sat, i) => {
              const mx = (cx0 + sat.x) / 2;
              const my = (cy0 + sat.y) / 2 - (i % 2 === 0 ? 22 : -18);
              const dur = 3.4 + i * 0.5;
              return (
                <circle key={i} r="2.2" fill="#fed7aa">
                  <animateMotion dur={`${dur}s`} begin={`${i * 0.6}s`} repeatCount="indefinite"
                    path={`M${cx0} ${cy0} Q ${mx} ${my} ${sat.x} ${sat.y}`} />
                  <animate attributeName="opacity" values="0;1;1;0" dur={`${dur}s`} begin={`${i * 0.6}s`} repeatCount="indefinite" />
                </circle>
              );
            })}
            {/* one returning */}
            {(() => {
              const sat = sats[4];
              const mx = (cx0 + sat.x) / 2;
              const my = (cy0 + sat.y) / 2 + 18;
              return (
                <circle r="1.8" fill="#a5f3fc" opacity="0.7">
                  <animateMotion dur="4.6s" begin="1.2s" repeatCount="indefinite"
                    path={`M${sat.x} ${sat.y} Q ${mx} ${my} ${cx0} ${cy0}`} />
                  <animate attributeName="opacity" values="0;0.9;0.9;0" dur="4.6s" begin="1.2s" repeatCount="indefinite" />
                </circle>
              );
            })()}
          </g>

          {/* dust */}
          <g fill="rgba(255,255,255,0.5)">
            {dust.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} opacity={d.op} />)}
          </g>

          {/* satellite icons */}
          <g>
            {sats.map((sat, i) => (
              <g key={sat.id}>
                {/* halo */}
                <circle cx={sat.x} cy={sat.y} r={sat.r * 2.3} fill="url(#mbSat)" opacity="0.32" filter="url(#mbGlow)">
                  <animate attributeName="opacity"
                    values="0.18;0.4;0.18"
                    dur={`${3 + (i % 3) * 0.6}s`}
                    begin={`${i * 0.3}s`} repeatCount="indefinite" />
                </circle>
                {/* tile */}
                <rect x={sat.x - sat.r} y={sat.y - sat.r}
                  width={sat.r * 2} height={sat.r * 2} rx="3"
                  fill="#1a120c"
                  stroke="rgba(253,186,116,0.55)" strokeWidth="1" />
                {/* label */}
                <text x={sat.x} y={sat.y + 2.4}
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="6.5"
                  fontWeight="700"
                  fill="#fed7aa" letterSpacing="0.4">{sat.label.toUpperCase()}</text>
              </g>
            ))}
          </g>

          {/* hero center icon */}
          <g transform={`translate(${cx0} ${cy0})`}>
            {/* outer halo */}
            <circle r="60" fill="url(#mbHero)" opacity="0.45" filter="url(#mbGlow)">
              <animate attributeName="opacity" values="0.3;0.55;0.3" dur="4s" repeatCount="indefinite" />
            </circle>
            <circle r="42" fill="url(#mbHero)" opacity="0.55" filter="url(#mbGlow)">
              <animate attributeName="opacity" values="0.4;0.7;0.4" dur="4s" begin="0.5s" repeatCount="indefinite" />
            </circle>
            {/* hero tile */}
            <rect x="-32" y="-32" width="64" height="64" rx="10"
              fill="#14110f"
              stroke="rgba(253,186,116,0.7)" strokeWidth="1.2" />
            {/* hero glyph: stacked layered squares (kit / bundle metaphor) */}
            <g stroke="#fed7aa" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="-18" y="-18" width="22" height="22" rx="3" opacity="0.45" />
              <rect x="-12" y="-12" width="22" height="22" rx="3" opacity="0.7" />
              <rect x="-6" y="-6" width="22" height="22" rx="3" opacity="1">
                <animate attributeName="opacity" values="0.7;1;0.7" dur="3s" repeatCount="indefinite" />
              </rect>
            </g>
            {/* corner specular */}
            <circle cx="-22" cy="-22" r="2" fill="#fff7ed" opacity="0.7" />
          </g>

          {/* small "+5 more" badge */}
          <g transform="translate(740 50)">
            <rect x="0" y="0" width="68" height="20" rx="4" fill="rgba(20,17,15,0.7)" stroke="rgba(255,255,255,0.10)" />
            <circle cx="9" cy="10" r="2" fill="#22c55e">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
            </circle>
            <text x="18" y="13.5"
              fontFamily="JetBrains Mono, monospace"
              fontSize="9"
              fill="#cbd5e1"
              letterSpacing="0.5">BUNDLE · 6</text>
          </g>
        </svg>

        <div style={mbStyles.overlay}>
          <div style={mbStyles.tagRow}>
            <div style={mbStyles.tag}>
              <span style={mbStyles.tagDot}></span>
              FEATURED
            </div>
            <div style={mbStyles.catPill}>Marketing</div>
          </div>
          <h2 style={mbStyles.title}>Outbound Crew Kit</h2>
          <p style={mbStyles.body}>
            Six tools, one install. Sourcing, drafting, sequencing, and reporting — wired together.
          </p>
          <div style={mbStyles.metaRow}>
            <span style={mbStyles.metaAuthor}>Automatos team</span>
            <span style={mbStyles.metaDot}>·</span>
            <span style={mbStyles.metaItem}>v2.0.1</span>
            <span style={mbStyles.metaDot}>·</span>
            <span style={mbStyles.metaItem}>892 installs</span>
            <span style={mbStyles.metaDot}>·</span>
            <span style={mbStyles.metaStar}>★ 4.9</span>
          </div>
        </div>

        <div style={mbStyles.ctaWrap}>
          <button style={mbStyles.cta}>
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

const mbStyles = {
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

window.MarketplaceFeaturedBundle = MarketplaceFeaturedBundle;
