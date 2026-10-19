// ═══════════════════════════════════════════════════════════════════
// Template 03 — STATS / DATA
// Style: 3 huge brick-orange numbers in a row, headline above, supporting cards below
// Use for: data-driven posts, "by the numbers", proof points
// ═══════════════════════════════════════════════════════════════════

// FIXED: stats row constrained to canvas width, smaller stat number,
// tighter padding so 3 cards always fit at 1080 wide.
const TplStats = ({
  size = { w: 1080, h: 1350 },
  page = '03',
  total = '10',
  handle = '@automatos.app',
  showChip = true,
  eyebrow = 'WHY IT MATTERS',
  headline = [
    { text: 'THE', color: 'ink' },
    { text: 'HARNESS', color: 'brick' },
    { text: 'IS THE', color: 'ink' },
    { text: 'PRODUCT.', color: 'ink' },
  ],
  stats = [
    { value: '5×', body: 'Manus rewrote their harness in 6 months. Same model. Better results each time.' },
    { value: '$2B', body: 'Meta acquired Manus — not for the model. For the harness engineering.' },
    { value: '80%', body: "Vercel removed 80% of their agent's tools — and got faster, better results." },
  ],
  cards = [
    { icon: '◯', heading: 'The model is now a commodity', body: 'Claude, GPT-4o, Gemini perform similarly. Two products using the same LLM deliver wildly different results. The harness is the differentiator.' },
    { icon: '+', heading: 'Harness quality determines success', body: 'TerminalBench 2.0: changing only the harness moved a LangChain Deep Agent from outside top 30 to top 5. Model unchanged.', dark: true },
  ],
  cta = 'Swipe to Know More',
  fontSize = 116,
  scale = 1,
}) => {
  const s = scale;
  return (
    <div style={{
      width: size.w * s, height: size.h * s,
      background: tw.paper,
      padding: `${64*s}px ${96*s}px ${48*s}px ${64*s}px`,
      display: 'flex', flexDirection: 'column',
      fontFamily: tw.display,
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Field name="page_num" inline><PageCount idx={page} total={total} /></Field>
        <Field name="handle" inline><HandlePill handle={handle} idx={page} total={total} showChip={showChip} /></Field>
      </div>

      <div style={{ marginTop: 28*s }}>
        <Field name="eyebrow" inline><Eyebrow>{eyebrow}</Eyebrow></Field>
      </div>

      <div style={{ marginTop: 24*s }}>
        <Field name="headline">
          <h1 style={{
            fontFamily: tw.display, fontWeight: 900,
            fontSize: fontSize*s, lineHeight: 0.92, letterSpacing: -2.5,
            margin: 0,
          }}>
            {headline.map((ln, i) => (
              <div key={i} style={{ color: ln.color === 'brick' ? tw.brick : tw.ink }}>{ln.text}</div>
            ))}
          </h1>
        </Field>
      </div>

      {/* stats row — width: 100%, minmax(0,1fr) prevents grid blowout */}
      <div style={{
        marginTop: 32*s, width: '100%', boxSizing: 'border-box',
        display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 10*s,
      }}>
        {stats.map((st, i) => (
          <Field name={`stat_${i+1}`} key={i}>
            <div style={{
              background: tw.card, borderRadius: 8,
              padding: `${20*s}px ${12*s}px`,
              textAlign: 'center',
              minWidth: 0,
            }}>
              <div style={{
                fontFamily: tw.display, fontWeight: 900,
                fontSize: 64*s, color: tw.brick, lineHeight: 1,
                letterSpacing: -1.5, marginBottom: 10*s,
                whiteSpace: 'nowrap',
              }}>{st.value}</div>
              <div style={{
                fontFamily: tw.mono, fontSize: 11.5*s, lineHeight: 1.45,
                color: tw.inkMuted,
              }}>{st.body}</div>
            </div>
          </Field>
        ))}
      </div>

      {/* supporting cards */}
      <div style={{ marginTop: 16*s, display: 'flex', flexDirection: 'column', gap: 10*s, flex: 1 }}>
        {cards.map((c, i) => (
          <Field name={`card_${i+1}`} key={i}>
            <BodyCard icon={c.icon} heading={c.heading} dark={c.dark}>{c.body}</BodyCard>
          </Field>
        ))}
      </div>

      <div style={{ marginTop: 18*s }}>
        <Footer handle={handle} cta={cta} />
      </div>
    </div>
  );
};

window.TplStats = TplStats;
