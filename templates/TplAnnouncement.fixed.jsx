// ═══════════════════════════════════════════════════════════════════
// Template 05 — ANNOUNCEMENT
// Style: status pill, big "NEW / LAUNCHING / SHIPPED" headline, feature row
// Use for: product launches, news, releases
// ═══════════════════════════════════════════════════════════════════

const TplAnnouncement = ({
  size = { w: 1080, h: 1350 },
  page = '01',
  total = '01',
  handle = '@automatos.app',
  showChip = false,
  status = 'SHIPPED · v2.4',
  eyebrow = 'PRODUCT LAUNCH',
  headline = [
    { text: 'NEW:', color: 'brick' },
    { text: 'PARALLEL', color: 'ink' },
    { text: 'MISSIONS.', color: 'ink' },
  ],
  subline = 'Run up to 9 agents in parallel on a single Mission. Shared field memory keeps them in sync. No more sequential bottlenecks.',
  features = [
    { icon: '◇', heading: '9× concurrency', body: 'Spin up to nine specialist agents per Mission, each with their own tools and goals.' },
    { icon: '⌘', heading: 'Shared field memory', body: 'Agents read/write a common memory band — sync without orchestration overhead.' },
    { icon: '→', heading: 'Drop-in for existing playbooks', body: 'Wrap any existing playbook step in a Mission block. Backward-compatible.' },
  ],
  cta = 'Read the changelog →',
  fontSize = 124,
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

      <div style={{ marginTop: 28*s, display: 'flex', alignItems: 'center', gap: 10*s }}>
        <Field name="eyebrow" inline><Eyebrow>{eyebrow}</Eyebrow></Field>
        <Field name="status" inline>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 12px', borderRadius: 999,
            background: 'rgba(255,105,50,0.14)',
            border: `1px solid ${tw.brick}`,
            fontFamily: tw.mono, fontSize: 11, fontWeight: 600,
            color: tw.brick, letterSpacing: 1.2, textTransform: 'uppercase',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: tw.brick, boxShadow: `0 0 8px ${tw.brick}` }} />
            {status}
          </div>
        </Field>
      </div>

      <div style={{ marginTop: 24*s }}>
        <Field name="headline">
          <h1 style={{
            fontFamily: tw.display, fontWeight: 900,
            fontSize: fontSize*s, lineHeight: 0.93, letterSpacing: -2.5,
            margin: 0,
          }}>
            {headline.map((ln, i) => (
              <div key={i} style={{ color: ln.color === 'brick' ? tw.brick : tw.ink }}>{ln.text}</div>
            ))}
          </h1>
        </Field>
      </div>

      <div style={{ marginTop: 24*s, maxWidth: 760*s }}>
        <Field name="subline">
          <p style={{
            fontFamily: tw.mono, fontSize: 17*s, lineHeight: 1.6,
            color: tw.inkDim, margin: 0,
          }}>{subline}</p>
        </Field>
      </div>

      <div style={{ marginTop: 28*s, display: 'flex', flexDirection: 'column', gap: 12*s, flex: 1 }}>
        {features.map((f, i) => (
          <Field name={`feature_${i+1}`} key={i}>
            <BodyCard icon={f.icon} heading={f.heading}>{f.body}</BodyCard>
          </Field>
        ))}
      </div>

      <div style={{ marginTop: 20*s }}>
        <Footer handle={handle} cta={cta} />
      </div>
    </div>
  );
};

window.TplAnnouncement = TplAnnouncement;
