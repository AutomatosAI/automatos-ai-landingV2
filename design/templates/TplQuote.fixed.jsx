// ═══════════════════════════════════════════════════════════════════
// Template 04 — QUOTE / INSPIRATION
// Style: massive quote with one accent word in brick, attribution below
// Use for: pull-quotes, inspirational posts, single-slide content
// ═══════════════════════════════════════════════════════════════════

const TplQuote = ({
  size = { w: 1080, h: 1350 },
  page = '01',
  total = '10',
  handle = '@automatos.app',
  showChip = false,
  eyebrow = 'FIELD NOTES',
  quote = 'The model is now a commodity. The harness is the moat.',
  accent = 'harness',  // word(s) inside quote to colour brick
  attribution = 'LangChain · canonical definition, 2026',
  cta = 'Save this post →',
  fontSize = 96,
  scale = 1,
}) => {
  const s = scale;

  // split quote at accent
  const renderQuote = () => {
    if (!accent || quote.indexOf(accent) < 0) {
      return <span>"{quote}"</span>;
    }
    const idx = quote.indexOf(accent);
    return (
      <span>
        "{quote.slice(0, idx)}<span style={{ color: tw.brick }}>{accent}</span>{quote.slice(idx + accent.length)}"
      </span>
    );
  };

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

      <div style={{ marginTop: 36*s }}>
        <Field name="eyebrow" inline><Eyebrow>{eyebrow}</Eyebrow></Field>
      </div>

      {/* big quote mark */}
      <div style={{
        marginTop: 32*s,
        fontFamily: tw.display, fontWeight: 900,
        fontSize: 220*s, lineHeight: 0.7, color: tw.brick,
        letterSpacing: -8,
      }}>"</div>

      <div style={{ flex: 1, marginTop: -20*s }}>
        <Field name="quote">
          <h1 style={{
            fontFamily: tw.display, fontWeight: 900,
            fontSize: fontSize*s, lineHeight: 1.0, letterSpacing: -2,
            margin: 0, color: tw.ink,
          }}>{renderQuote()}</h1>
        </Field>

        <div style={{
          marginTop: 32*s, paddingTop: 18*s,
          borderTop: `2px solid ${tw.ink}`,
          maxWidth: 600*s,
        }}>
          <Field name="attribution" inline>
            <div style={{
              fontFamily: tw.mono, fontSize: 15*s, color: tw.ink,
              fontWeight: 600, letterSpacing: 0.4,
            }}>— {attribution}</div>
          </Field>
        </div>
      </div>

      <div style={{ marginTop: 20*s }}>
        <Footer handle={handle} cta={cta} />
      </div>
    </div>
  );
};

window.TplQuote = TplQuote;
