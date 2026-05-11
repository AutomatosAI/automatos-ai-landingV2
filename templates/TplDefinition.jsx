// ═══════════════════════════════════════════════════════════════════
// Template 02 — DEFINITION / EXPLAINER
// Style: large headline + 3 body cards w/ orange-icon bullets
// Use for: "What is X?", carousel slide 2, educational
// ═══════════════════════════════════════════════════════════════════

const TplDefinition = ({
  size = { w: 1080, h: 1350 },
  page = '02',
  total = '10',
  handle = '@automatos.app',
  showChip = true,
  eyebrow = 'FIRST — THE CONCEPT',
  headline = [
    { text: 'WHAT IS', color: 'ink' },
    { text: 'AN AGENT?', color: 'ink', accent: 'AGENT?' },
  ],
  // accent = the substring inside text to brick-color
  cards = [
    { icon: '?', heading: 'Not just a chatbot', body: 'A chatbot replies. An agent acts — it plans, uses tools, loops on results, and drives toward a goal autonomously.' },
    { icon: '↻', heading: 'The core loop', body: 'Perceive input → Reason about it → Pick an action → Execute → Observe result → Repeat until done.' },
    { icon: '✦', heading: '3 must-haves', body: 'An LLM brain. A set of tools to call. A loop that keeps running until the goal is met.' },
  ],
  cta = 'Swipe to Know More',
  fontSize = 132,
  scale = 1,
}) => {
  const s = scale;

  // helper: render headline with mid-line accent split
  const renderLine = (ln) => {
    if (!ln.accent) return <div style={{ color: ln.color === 'brick' ? tw.brick : tw.ink }}>{ln.text}</div>;
    const idx = ln.text.indexOf(ln.accent);
    if (idx < 0) return <div style={{ color: tw.ink }}>{ln.text}</div>;
    const before = ln.text.slice(0, idx);
    const after = ln.text.slice(idx + ln.accent.length);
    return (
      <div style={{ color: tw.ink }}>
        {before}<span style={{ color: tw.brick }}>{ln.accent}</span>{after}
      </div>
    );
  };

  return (
    <div style={{
      width: size.w * s, height: size.h * s,
      background: tw.paper, position: 'relative',
      padding: `${64*s}px ${64*s}px ${48*s}px`,
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

      <div style={{ marginTop: 28*s }}>
        <Field name="headline">
          <h1 style={{
            fontFamily: tw.display, fontWeight: 900,
            fontSize: fontSize*s, lineHeight: 0.92, letterSpacing: -2.5,
            margin: 0,
          }}>
            {headline.map((ln, i) => <React.Fragment key={i}>{renderLine(ln)}</React.Fragment>)}
          </h1>
        </Field>
      </div>

      <div style={{ marginTop: 36*s, display: 'flex', flexDirection: 'column', gap: 14*s, flex: 1 }}>
        {cards.map((c, i) => (
          <Field name={`card_${i+1}`} key={i}>
            <BodyCard icon={c.icon} heading={c.heading}>{c.body}</BodyCard>
          </Field>
        ))}
      </div>

      <div style={{ marginTop: 20*s }}>
        <Footer handle={handle} cta={cta} />
      </div>
    </div>
  );
};

window.TplDefinition = TplDefinition;
