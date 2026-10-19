// Automatos — Social Template Brand Tokens
// Mirrors the editorial cream/orange aesthetic from reference carousels.

// Automatos brand tokens — sourced from frontend/app/globals.css
const tw = {
  // surfaces — warm cream paper (social-friendly canvas)
  paper: '#f1e9dd',
  paperDeep: '#ebe2d3',
  card: '#e3d9c8',          // soft warm-gray card fill
  cardDark: '#0F0F0F',      // matches --background dark
  ink: '#191919',           // matches --foreground light
  inkDim: '#3a3a3a',
  inkMuted: '#6b6256',

  // brand — Automatos orange (Dark/Matte --primary, the canonical brand mark)
  brick: '#FF6932',         // primary
  brickDeep: '#FF4400',     // light --primary, used for hot accents
  brickSoft: '#FF8A5C',     // softer for hover/secondary
  pill: '#191919',          // eyebrow pill bg = --foreground light
  pillDot: '#FF6932',       // ▲ glyph

  // chart palette — for variety across post families
  blue: '#3C83F5',          // --info
  green: '#0FB67F',         // --success
  purple: '#A854F6',        // --agent
  amber: '#FABD23',         // --warning

  // type — codebase has no custom font; use Inter as the closest cross-platform
  // proxy for the system stack (SF Pro / Segoe UI). JetBrains Mono is the only
  // explicit font in the codebase (used for log/code blocks).
  display: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

// ── Eyebrow pill: black rounded pill w/ orange ▲ + caps mono label
const Eyebrow = ({ children }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 8,
    background: tw.pill, color: '#fff',
    padding: '6px 14px', borderRadius: 6,
    fontFamily: tw.mono, fontSize: 11, fontWeight: 600,
    letterSpacing: 1.6, textTransform: 'uppercase',
  }}>
    <span style={{ color: tw.pillDot, fontSize: 9, transform: 'translateY(-1px)' }}>▲</span>
    {children}
  </div>
);

// ── Page counter — top-left "01 / 10"
const PageCount = ({ idx, total }) => (
  <span style={{
    fontFamily: tw.mono, fontSize: 13, fontWeight: 600,
    color: tw.brick, letterSpacing: 1,
  }}>
    {String(idx).padStart(2,'0')} / {String(total).padStart(2,'0')}
  </span>
);

// ── Handle pill (top-right) — handle text + dark counter chip
const HandlePill = ({ handle, idx, total, showChip = true }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <span style={{ fontFamily: tw.mono, fontSize: 13, color: tw.inkDim, fontWeight: 500 }}>{handle}</span>
    {showChip && (
      <div style={{
        background: '#7a7468', color: '#fff',
        fontFamily: tw.mono, fontSize: 13, fontWeight: 600,
        padding: '4px 10px', borderRadius: 999,
      }}>
        {idx}/{total}
      </div>
    )}
  </div>
);

// ── Footer — handle left, swipe right, sound icon
const Footer = ({ handle, cta = 'Swipe to Know More', muted = true }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 14, borderTop: `1px solid rgba(13,13,13,0.08)`,
  }}>
    <span style={{ fontFamily: tw.mono, fontSize: 13, color: tw.ink, fontWeight: 500 }}>{handle}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontFamily: tw.mono, fontSize: 13, color: tw.inkDim }}>{cta}</span>
      <div style={{
        width: 26, height: 26, borderRadius: '50%',
        background: '#7a7468', color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13,
      }}>{muted ? '🔇' : '🔊'}</div>
    </div>
  </div>
);

// ── Numbered list bullet (orange circle w/ glyph) used in body cards
const Bullet = ({ glyph = '?', size = 28 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: tw.brick, color: '#fff',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: tw.mono, fontSize: 14, fontWeight: 700,
    flexShrink: 0,
  }}>{glyph}</div>
);

// ── Body card — soft warm-gray container w/ icon + heading + text
const BodyCard = ({ icon, heading, children, dark = false }) => (
  <div style={{
    background: dark ? tw.cardDark : tw.card,
    color: dark ? '#e8e2d6' : tw.ink,
    borderRadius: 8,
    padding: '16px 20px',
    display: 'flex', gap: 14, alignItems: 'flex-start',
  }}>
    {icon && <Bullet glyph={icon} />}
    <div style={{ flex: 1 }}>
      <div style={{
        fontFamily: tw.mono, fontWeight: 700, fontSize: 14,
        color: dark ? '#fff' : tw.ink, marginBottom: 4, letterSpacing: 0.1,
      }}>{heading}</div>
      <div style={{
        fontFamily: tw.mono, fontSize: 12.5, lineHeight: 1.55,
        color: dark ? '#b9b1a3' : tw.inkMuted,
      }}>{children}</div>
    </div>
  </div>
);

// ── Editorial display headline — supports per-word color override
// Usage: <Display lines={[{text:'WHAT IS', color:'ink'},{text:'AN AGENT?', color:'brick'}]} />
const Display = ({ lines, size = 96, weight = 900 }) => (
  <h1 style={{
    fontFamily: tw.display, fontWeight: weight,
    fontSize: size, lineHeight: 0.95, letterSpacing: -2.5,
    margin: 0, color: tw.ink,
  }}>
    {lines.map((ln, i) => (
      <div key={i} style={{ color: ln.color === 'brick' ? tw.brick : tw.ink }}>
        {ln.text}
      </div>
    ))}
  </h1>
);

// ── Autofill field marker — visual dashed outline + tooltip
const Field = ({ name, children, inline = false }) => (
  <span
    data-autofill={name}
    style={{
      position: 'relative',
      display: inline ? 'inline' : 'block',
      outline: '1.5px dashed rgba(255,105,50,0.5)',
      outlineOffset: 3,
      borderRadius: 1,
    }}
  >{children}</span>
);

// ── Spec sheet — autofill field reference for a template
const SpecSheet = ({ name, dims, fields, notes }) => (
  <div style={{
    fontFamily: tw.mono, fontSize: 11.5, lineHeight: 1.65,
    background: '#0e0d12', border: '1px solid rgba(255,255,255,0.06)',
    color: '#94a3b8', borderRadius: 12, padding: '20px 24px',
  }}>
    <div style={{ color: '#fdba74', fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
      canva autofill spec
    </div>
    <div style={{
      color: '#f9fafb', fontFamily: tw.display, fontWeight: 600,
      fontSize: 17, marginBottom: 4, letterSpacing: -0.3,
    }}>{name}</div>
    <div style={{ color: '#64748b', marginBottom: 16 }}>{dims}</div>

    <div style={{ color: '#fed7aa', fontSize: 10, letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 8 }}>
      fields ({fields.length})
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {fields.map(f => (
        <div key={f.k} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, paddingBottom: 5, borderBottom: '1px dashed rgba(255,255,255,0.06)' }}>
          <span style={{ color: '#fdba74' }}>{`{{${f.k}}}`}</span>
          <span style={{ color: '#94a3b8' }}>{f.t}</span>
        </div>
      ))}
    </div>
    {notes && (
      <div style={{ marginTop: 14, color: '#64748b', fontSize: 11, lineHeight: 1.6 }}>
        <span style={{ color: '#fed7aa', textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 10 }}>note · </span>
        {notes}
      </div>
    )}
  </div>
);

Object.assign(window, { tw, Eyebrow, PageCount, HandlePill, Footer, Bullet, BodyCard, Display, Field, SpecSheet });
