// ═══════════════════════════════════════════════════════════════════
// Template 01 — TITLE / HOOK
// Style: huge editorial headline, last word(s) in brick orange
// Use for: Carousel cover slides, big announcements, hooks
// ═══════════════════════════════════════════════════════════════════

const TplTitle = ({
  size = { w: 1080, h: 1350 },
  page = '01',
  total = '10',
  handle = '@automatos.app',
  showChip = false,
  eyebrow = 'AI ARCHITECTURE 2026',
  headline = [
    { text: 'AGENT', color: 'ink' },
    { text: 'HARNESS.', color: 'brick' },
    { text: 'THE OS', color: 'ink' },
    { text: 'FOR AI.', color: 'ink' },
  ],
  subline = "The model is the brain. The harness is everything else. Here's why the harness is the most important piece of your AI system — and how it works.",
  cta = 'Swipe to Start',
  fontSize = 152,
  scale = 1,
}) => {
  const s = scale;
  return (
    <div style={{
      width: size.w * s, height: size.h * s,
      background: tw.paper, position: 'relative',
      padding: `${64*s}px ${96*s}px ${48*s}px ${64*s}px`,
      display: 'flex', flexDirection: 'column',
      fontFamily: tw.display,
      transform: `scale(1)`,
      overflow: 'hidden',
    }}>
      {/* top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Field name="page_num" inline><PageCount idx={page} total={total} /></Field>
        <Field name="handle" inline><HandlePill handle={handle} idx={page} total={total} showChip={showChip} /></Field>
      </div>

      {/* eyebrow */}
      <div style={{ marginTop: 36*s }}>
        <Field name="eyebrow" inline><Eyebrow>{eyebrow}</Eyebrow></Field>
      </div>

      {/* headline */}
      <div style={{ marginTop: 32*s, flex: 1 }}>
        <Field name="headline">
          <h1 style={{
            fontFamily: tw.display, fontWeight: 900,
            fontSize: fontSize*s, lineHeight: 0.92, letterSpacing: -3,
            margin: 0,
          }}>
            {headline.map((ln, i) => (
              <div key={i} style={{ color: ln.color === 'brick' ? tw.brick : tw.ink }}>{ln.text}</div>
            ))}
          </h1>
        </Field>

        {/* subline */}
        {subline && (
          <div style={{ marginTop: 32*s, maxWidth: 720*s }}>
            <Field name="subline">
              <p style={{
                fontFamily: tw.mono, fontSize: 18*s, lineHeight: 1.6,
                color: tw.inkDim, margin: 0, fontWeight: 500,
              }}>{subline}</p>
            </Field>
          </div>
        )}
      </div>

      {/* footer */}
      <div style={{ marginTop: 24*s }}>
        <Footer handle={handle} cta={cta} />
      </div>
    </div>
  );
};

window.TplTitle = TplTitle;
