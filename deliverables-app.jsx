/* global React, ReactDOM, TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakToggle, TweakSelect */
const { useState, useMemo } = React;

// ---------- Sample data ----------
const TODAY_ITEMS = [
  { id: 't1', title: 'Workflow Slide 1', kind: 'Slide', agent: 'SOCIAL OPS', ago: '2h', isNew: true,
    thumb: <div className="slide-thumb"><div><div className="tagline">Automatos · Workflows</div><h4>WORKFLOWS<br/><span className="accent">BY THE</span><br/>NUMBERS.</h4></div><div className="footer"><span>01 / 04</span><span>Thu W19</span></div></div> },
  { id: 't2', title: 'Workflow Slide 2', kind: 'Slide', agent: 'SOCIAL OPS', ago: '2h', isNew: true,
    thumb: <div className="slide-thumb"><div><div className="tagline">A workflow is a contract</div><h4 style={{fontSize:14}}>"A workflow is a <span className="accent">contract</span>. Define it once. Trust it every time."</h4></div><div className="footer"><span>02 / 04</span><span>Thu W19</span></div></div> },
  { id: 't3', title: 'Workflow Slide 3', kind: 'Slide', agent: 'SOCIAL OPS', ago: '2h', isNew: true,
    thumb: <div className="slide-thumb alt"><div><div className="tagline" style={{opacity:.6}}>What is a workflow</div><h4 style={{color:'#f6f1e6'}}>WHAT IS<br/>A <span className="accent">WORK<br/>FLOW?</span></h4></div><div className="footer"><span>03 / 04</span><span>Thu W19</span></div></div> },
  { id: 't4', title: 'Daily Social Analytics', kind: 'Report', agent: 'PLAYBOOK', ago: '4h', isNew: true,
    thumb: <div className="report-thumb"><div className="rh"/><div className="rl med"/><div className="rl short"/><div className="rl med"/><div className="chart"/></div> },
  { id: 't5', title: 'Marketplace Strategy', kind: 'Doc', agent: 'AUTO', ago: '9h', isNew: false,
    thumb: <div className="doc-thumb"><div className="h"/><div className="l m"/><div className="l l"/><div className="l s"/><div className="l m"/><div className="l l"/></div> },
  { id: 't6', title: 'Hero image — Q4 launch', kind: 'Image', agent: 'CANVAS', ago: '11h', isNew: false,
    thumb: <div className="img-thumb"/> },
];

const COLLECTIONS = [
  {
    id: 'c1', title: 'Daily Social — Week 19', count: 8,
    summary: '4 carousel slides · caption · publish report · 2 variants',
    fresh: true, agent: 'Social Ops', when: 'Updated 2h ago',
    stack: [
      <div className="slide-thumb"><div><div className="tagline">Automatos · Workflows</div><h4>WORKFLOWS<br/><span className="accent">BY THE</span><br/>NUMBERS.</h4></div></div>,
      <div className="slide-thumb"><div><div className="tagline">Quote</div><h4 style={{fontSize:14}}>"A workflow is a <span className="accent">contract</span>."</h4></div></div>,
      <div className="slide-thumb alt"><div><div className="tagline" style={{opacity:.6}}>What is a workflow</div><h4 style={{color:'#f6f1e6'}}>WHAT IS<br/>A <span className="accent">WORK<br/>FLOW?</span></h4></div></div>,
    ],
  },
  {
    id: 'c2', title: 'Marketplace Strategy', count: 5,
    summary: 'Reference workspace strategy · 3 supporting docs · pricing model',
    fresh: false, agent: 'Auto', when: 'Updated 9h ago',
    stack: [
      <div className="doc-thumb"><div className="h"/><div className="l m"/><div className="l l"/><div className="l s"/><div className="l m"/></div>,
      <div className="doc-thumb"><div className="h"/><div className="l l"/><div className="l m"/><div className="l m"/><div className="l s"/></div>,
      <div className="doc-thumb"><div className="h"/><div className="l m"/><div className="l l"/><div className="l l"/><div className="l m"/></div>,
    ],
  },
  {
    id: 'c3', title: 'Onboarding Refresh', count: 12,
    summary: '6 product screenshots · 3 step diagrams · email sequence',
    fresh: false, agent: 'Canvas + Scribe', when: 'Updated yesterday',
    stack: [
      <div className="img-thumb"/>,
      <div className="img-thumb warm"/>,
      <div className="img-thumb bw"/>,
    ],
  },
  {
    id: 'c4', title: 'GA Weekly Brief — W19', count: 4,
    summary: 'Funnel report · channel breakdown · cohort chart · narrative',
    fresh: true, agent: 'GA Analyst', when: 'Updated 13h ago',
    stack: [
      <div className="report-thumb"><div className="rh"/><div className="rl med"/><div className="rl short"/><div className="chart"/></div>,
      <div className="report-thumb"><div className="rh"/><div className="rl m"/><div className="rl med"/><div className="chart"/></div>,
      <div className="report-thumb"><div className="rh"/><div className="rl short"/><div className="rl med"/><div className="chart"/></div>,
    ],
  },
];

const TYPE_ROWS = [
  { id: 'slides', title: 'Slides & Decks', icon: '🎞', meta: '142 items',
    items: Array.from({length: 10}, (_, i) => ({
      title: `2026-W${17 + (i%3)} Slide ${(i%4)+1}`,
      meta: ['SOCIAL OPS','SCRIBE','SOCIAL OPS','CANVAS'][i%4] + ' · ' + ['2h','5h','1d','2d','3d','5d','1w','2w','3w','1mo'][i%10] + ' ago',
      thumb: i%3===0 ? <div className="slide-thumb"><div><div className="tagline">Automatos</div><h4>WORK<br/><span className="accent">FLOW</span><br/>{i+1}</h4></div></div>
            : i%3===1 ? <div className="slide-thumb alt"><div><div className="tagline" style={{opacity:.6}}>Quote</div><h4 style={{color:'#f6f1e6',fontSize:13}}>"Build it once. <span className="accent">Trust</span> every run."</h4></div></div>
            : <div className="slide-thumb"><div><div className="tagline">Numbers</div><h4 style={{fontSize:24}}>{84+i}<span className="accent" style={{fontSize:12}}>%</span></h4></div></div>,
    })),
    tall: true,
  },
  { id: 'reports', title: 'Reports', icon: '📊', meta: '63 items',
    items: Array.from({length: 8}, (_, i) => ({
      title: ['FIXER Heartbeat','GA Weekly Brief','Cost Tracker — May','Funnel Audit','Social Analytics','Spend Forecast','Engineering Velocity','Customer Pulse'][i],
      meta: (['FIXER','GA ANALYST','PLAYBOOK','GA ANALYST','PLAYBOOK','SCRIBE','PULSE','PULSE'][i]) + ' · ' + ['2h','5h','12h','1d','2d','3d','4d','1w'][i] + ' ago',
      thumb: <div className="report-thumb"><div className="rh"/><div className="rl med"/><div className="rl short"/><div className="rl med"/><div className="chart"/></div>,
    })),
  },
  { id: 'images', title: 'Images', icon: '🖼', meta: '486 items',
    items: Array.from({length: 10}, (_, i) => ({
      title: ['Hero — Q4 launch','OG image','Carousel cover','Banner ad','Brand mark','Email header','Storefront','Twitter card','Open graph','Avatar'][i],
      meta: 'CANVAS · ' + ['11h','15h','1d','2d','3d','3d','5d','1w','1w','2w'][i] + ' ago',
      thumb: i%3===0 ? <div className="img-thumb"/> : i%3===1 ? <div className="img-thumb warm"/> : <div className="img-thumb bw"/>,
    })),
  },
  { id: 'docs', title: 'Documents & Blog Posts', icon: '📝', meta: '218 items',
    items: Array.from({length: 8}, (_, i) => ({
      title: ['Workflow Templates — explainer','LinkedIn carousel publish report','Q4 OKR draft','Marketplace pricing rationale','How agents handoff','New hire SOP','Brand voice guide','Release notes'][i],
      meta: ['SCRIBE','PLAYBOOK','AUTO','AUTO','SCRIBE','SCRIBE','SCRIBE','FIXER'][i] + ' · ' + ['3h','5h','12h','1d','2d','3d','4d','1w'][i] + ' ago',
      thumb: <div className="doc-thumb"><div className="h"/><div className="l m"/><div className="l l"/><div className="l s"/><div className="l m"/><div className="l l"/></div>,
    })),
  },
];

const HEARTBEATS = [
  { agent: 'FIXER', name: 'FIXER Heartbeat', size: '384 B', ago: '12h', ok: true },
  { agent: 'GA ANALYST', name: 'GA ANALYST Heartbeat', size: '740 B', ago: '13h', ok: true },
  { agent: 'SENTINEL', name: 'SENTINEL Heartbeat', size: '524 B', ago: '13h', ok: true },
  { agent: 'ORCHESTRATOR', name: 'Orchestrator Heartbeat', size: '818 B', ago: '14h', ok: true },
  { agent: 'PULSE', name: 'PULSE Heartbeat', size: '612 B', ago: '15h', ok: true },
  { agent: 'CANVAS', name: 'CANVAS Heartbeat', size: '440 B', ago: '16h', ok: true },
  { agent: 'QUILL', name: 'QUILL Heartbeat', size: '388 B', ago: '17h', ok: false },
  { agent: 'SCRIBE', name: 'SCRIBE Heartbeat', size: '512 B', ago: '18h', ok: true },
];

// ---------- Components ----------
const Rail = () => (
  <aside className="rail">
    {['💬','🧩','📋','📦','🍯','🤖','🗃','🛍','👤','📈','🏢'].map((g, i) => (
      <div key={i} className={"rail-icon" + (i === 3 ? ' active' : '')} style={{fontSize: 14}}>{g}</div>
    ))}
  </aside>
);

const TopBar = () => (
  <header className="topbar">
    <div className="brand"><div className="brand-mark"/>AUTOMATOS A.I.</div>
    <div className="top-spacer"/>
    <div className="top-actions">
      <span className="top-pill">📚</span>
      <span className="top-pill">🌙</span>
      <span className="top-pill">🔔 9+</span>
      <span className="top-pill" style={{background: 'linear-gradient(135deg,#ff6b35,#f7931e)', color: '#1a0e08', fontWeight: 700, borderColor: 'transparent'}}>A</span>
    </div>
  </header>
);

const TabBar = ({ tab, setTab }) => (
  <div className="tabs">
    {[
      {id:'outputs', label:'Outputs', count: 17},
      {id:'blogs', label:'Blogs'},
      {id:'templates', label:'Templates'},
      {id:'explorer', label:'Explorer'},
    ].map(t => (
      <button key={t.id} className={"tab" + (tab===t.id?' active':'')} onClick={() => setTab(t.id)}>
        {t.label}
        {t.count != null && <span className="count">{t.count} new</span>}
      </button>
    ))}
  </div>
);

const TodayHero = ({ items, showInboxPips }) => (
  <section className="today section">
    <div className="today-top">
      <div>
        <div className="today-headline">
          Your team made <strong>17 things</strong> today —{' '}
          <span style={{opacity:.7}}>14 are still unread.</span>
        </div>
        <div className="today-byline">Thursday, May 8 · 9 agents active</div>
      </div>
      <div className="today-stats">
        <div className="stat"><span className="num">8</span> images</div>
        <div className="stat"><span className="num">4</span> slides</div>
        <div className="stat"><span className="num">3</span> reports</div>
        <div className="stat"><span className="num">1</span> blog post</div>
        <div className="stat"><span className="num">1</span> doc</div>
      </div>
    </div>
    <div className="today-strip">
      {items.map(it => (
        <div className="today-card" key={it.id}>
          <div className="thumb">
            {it.thumb}
            <div className="thumb-meta">{it.kind}</div>
          </div>
          <div className="body">
            <div className="title">{showInboxPips && it.isNew ? <span className="new-pip"/> : null}{it.title}</div>
            <div className="meta">{it.agent} · {it.ago} ago</div>
          </div>
        </div>
      ))}
    </div>
  </section>
);

const CollectionCard = ({ c, onOpen }) => (
  <div className="collection" onClick={() => onOpen(c)}>
    <div className="collection-stack">
      {c.stack.map((node, i) => (
        <div className={"stack-card s" + (i+1)} key={i}>{node}</div>
      ))}
    </div>
    <div className="collection-head">
      <div className="collection-title">{c.title}</div>
      <div className="pill">{c.count}</div>
    </div>
    <div className="collection-meta">
      {c.fresh ? <span className="pill fresh">● new today</span> : null}
      <span>{c.agent}</span>
      <span>·</span>
      <span>{c.when}</span>
    </div>
    <div style={{color:'var(--text-3)', fontSize:'12px', marginTop:8, lineHeight:1.4}}>{c.summary}</div>
  </div>
);

const Collections = ({ onOpen }) => (
  <section className="section">
    <div className="section-head">
      <div className="section-title"><span className="dot"/> Active workspaces</div>
      <div className="section-actions">
        <button className="ghost-btn">+ New workspace</button>
        <button className="ghost-btn">See all 14 →</button>
      </div>
    </div>
    <div className="collections">
      {COLLECTIONS.map(c => <CollectionCard key={c.id} c={c} onOpen={onOpen}/>)}
    </div>
  </section>
);

const TypeCard = ({ item, tall }) => (
  <div className={"type-card" + (tall ? ' tall' : '')}>
    <div className="thumb">{item.thumb}</div>
    <div className="body">
      <div className="title">{item.title}</div>
      <div className="meta">{item.meta}</div>
    </div>
  </div>
);

const TypeRow = ({ row }) => (
  <div className="type-row">
    <div className="section-head">
      <div className="section-title" style={{fontSize:15}}>
        <span style={{fontSize:14}}>{row.icon}</span> {row.title}
        <span className="section-meta" style={{marginLeft:6}}>{row.meta}</span>
      </div>
      <button className="ghost-btn">See all →</button>
    </div>
    <div className="row-track">
      {row.items.map((it, i) => <TypeCard key={i} item={it} tall={row.tall}/>)}
    </div>
  </div>
);

const SystemStrip = ({ heartbeats, mode }) => {
  if (mode === 'hidden') return null;
  return (
    <section className="section">
      <div className="system-strip">
        <div className="system-head">
          <div className="system-title">
            <span className="system-title-dot"/>
            System diagnostics ·{' '}
            <span style={{color:'var(--text-3)'}}>{heartbeats.length} agent heartbeats today</span>
          </div>
          <button className="ghost-btn">Open in Explorer →</button>
        </div>
        {mode === 'expanded' && (
          <div className="system-rows">
            {heartbeats.map((h, i) => (
              <div className="system-row" key={i}>
                <div className="system-icon">♥</div>
                <div>
                  <div className="name">{h.name}</div>
                  <div className="agent">{h.agent} · {h.size}</div>
                </div>
                <span className={"status-ok" + (!h.ok ? ' status-warn' : '')} title={h.ok ? 'OK' : 'Warning'}/>
                <div className="ago">{h.ago} ago</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const HomeView = ({ tweaks, onOpen }) => (
  <>
    <TodayHero items={TODAY_ITEMS} showInboxPips={tweaks.showInboxPips}/>
    <Collections onOpen={onOpen}/>
    <section className="section">
      <div className="section-head">
        <div className="section-title"><span className="dot" style={{background:'var(--text-3)'}}/> Browse by type</div>
        <button className="ghost-btn">Switch to grid →</button>
      </div>
      {TYPE_ROWS.map(r => <TypeRow key={r.id} row={r}/>)}
    </section>
    <SystemStrip heartbeats={HEARTBEATS} mode={tweaks.heartbeatMode}/>
  </>
);

const DetailView = ({ collection, onBack }) => (
  <>
    <button className="detail-back" onClick={onBack}>← Back to Deliverables</button>
    <div className="breadcrumb">Deliverables <span className="sep">/</span> Active workspaces <span className="sep">/</span> {collection.title}</div>
    <div className="detail">
      <div>
        <div className="detail-hero" style={{marginBottom: 18}}>
          <h1 className="detail-title">{collection.title}</h1>
          <p className="detail-sub">{collection.summary}</p>
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            <button className="ghost-btn primary">Open all in Explorer</button>
            <button className="ghost-btn">Download .zip</button>
            <button className="ghost-btn">Share</button>
            <button className="ghost-btn">Pin workspace</button>
          </div>
          <div className="detail-grid">
            {Array.from({length: 6}).map((_, i) => (
              <TypeCard key={i} item={{
                title: i < 4 ? `Workflow Slide ${i+1}` : i === 4 ? 'Caption.md' : 'Publish report',
                meta: 'SOCIAL OPS · 2h ago',
                thumb: i < 4
                  ? <div className="slide-thumb"><div><div className="tagline">Automatos</div><h4>WORK<br/><span className="accent">FLOW</span><br/>0{i+1}</h4></div></div>
                  : i === 4
                  ? <div className="doc-thumb"><div className="h"/><div className="l m"/><div className="l l"/><div className="l s"/></div>
                  : <div className="report-thumb"><div className="rh"/><div className="rl med"/><div className="chart"/></div>,
              }}/>
            ))}
          </div>
        </div>
      </div>
      <div className="detail-aside">
        <div className="aside-card">
          <h4>Activity</h4>
          <div className="timeline">
            {[
              {agent: 'Social Ops', what: 'Generated 4 carousel slides', when: '2h ago'},
              {agent: 'Scribe', what: 'Drafted caption + hashtags', when: '2h ago'},
              {agent: 'Playbook', what: 'Posted to LinkedIn (text only)', when: '1h ago'},
              {agent: 'Playbook', what: 'Image attach failed — flagged', when: '55m ago'},
              {agent: 'Fixer', what: 'Opened ticket: image upload retry', when: '40m ago'},
            ].map((t, i) => (
              <div className="timeline-item" key={i}>
                <div className="dot" style={{background: i === 3 ? 'var(--red)' : 'var(--orange)'}}/>
                <div>
                  <div>{t.what}</div>
                  <div className="agent">{t.agent}</div>
                </div>
                <div className="when">{t.when}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="aside-card">
          <h4>Workspace info</h4>
          <div style={{fontSize:13, color:'var(--text-2)', lineHeight:1.7}}>
            <div><b style={{color:'var(--text)'}}>Source playbook</b> · Daily social analytics</div>
            <div><b style={{color:'var(--text)'}}>Schedule</b> · Mon/Wed/Thu 09:00</div>
            <div><b style={{color:'var(--text)'}}>Owner</b> · Auto</div>
            <div><b style={{color:'var(--text)'}}>Files</b> · 8</div>
            <div><b style={{color:'var(--text)'}}>Total size</b> · 642 KB</div>
          </div>
        </div>
        <div className="aside-card">
          <h4>Needs your attention</h4>
          <div style={{fontSize:13, color:'var(--text-2)'}}>
            <div style={{padding:'8px 10px', background:'rgba(255,90,77,.08)', border:'1px solid rgba(255,90,77,.25)', borderRadius:8, marginBottom:8}}>
              <b style={{color:'var(--red)'}}>Image upload failed</b><br/>
              <span style={{color:'var(--text-3)', fontSize:12}}>The 4 slides published as text-only. Reattach images?</span>
            </div>
            <button className="ghost-btn primary" style={{width:'100%'}}>Retry image attach</button>
          </div>
        </div>
      </div>
    </div>
  </>
);

// ---------- App ----------
const App = () => {
  const [tab, setTab] = useState('outputs');
  const [view, setView] = useState({ kind: 'home' });
  const [tweaks, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "heartbeatMode": "demoted",
    "showInboxPips": true,
    "intro": true
  }/*EDITMODE-END*/);

  const open = (c) => setView({ kind: 'detail', collection: c });
  const back = () => setView({ kind: 'home' });

  return (
    <div className="app">
      <Rail/>
      <main>
        <TopBar/>
        <div className="page">
          <div className="page-header">
            <div>
              <h1 className="page-title">Deliverables</h1>
              <p className="page-sub">Files, reports & agent output</p>
            </div>
          </div>
          <TabBar tab={tab} setTab={setTab}/>

          {tweaks.intro && view.kind === 'home' && (
            <div className="intro">
              <div className="intro-mark">↺</div>
              <div>
                <h3>Deliverables · re-imagined as a team output feed</h3>
                <p>This view answers the three questions a non-techy user actually asks: <b>"what did my team make today"</b>, <b>"where's that thing I was working on"</b>, and <b>"show me all the X you've made"</b> — in that order. The flat 2,393-card grid is gone; in its place: a Today hero, project-level workspaces, Netflix-style type rows, and a quiet system strip for diagnostics.</p>
                <p style={{marginTop:8}}><b>Try it:</b> click any workspace card to drill in. Toggle Tweaks (top-right) to test heartbeat handling, inbox pips, and density.</p>
              </div>
            </div>
          )}

          {view.kind === 'home'
            ? <HomeView tweaks={tweaks} onOpen={open}/>
            : <DetailView collection={view.collection} onBack={back}/>
          }
        </div>
      </main>

      <TweaksPanel title="Tweaks">
        <TweakSection title="System diagnostics (heartbeats)">
          <TweakRadio
            label="Treatment"
            value={tweaks.heartbeatMode}
            onChange={(v) => setTweak('heartbeatMode', v)}
            options={[
              { value: 'hidden', label: 'Hidden' },
              { value: 'demoted', label: 'Demoted' },
              { value: 'expanded', label: 'Expanded' },
            ]}
          />
          <div style={{fontSize:12, color:'#888', marginTop:6, lineHeight:1.5}}>
            <b>Hidden</b> — Heartbeats only show in Explorer (recommended).<br/>
            <b>Demoted</b> — A small system strip below all real deliverables.<br/>
            <b>Expanded</b> — Full list visible.
          </div>
        </TweakSection>

        <TweakSection title="Inbox behaviour">
          <TweakToggle
            label="Show 'new' pips on unread items"
            value={tweaks.showInboxPips}
            onChange={(v) => setTweak('showInboxPips', v)}
          />
        </TweakSection>

        <TweakSection title="Page intro">
          <TweakToggle
            label="Show design rationale banner"
            value={tweaks.intro}
            onChange={(v) => setTweak('intro', v)}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
