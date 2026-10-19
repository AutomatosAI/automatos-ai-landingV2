// Automatos — Deliverable Icons v1
// 7 types × 3 sizes = 21 icons.
// All Hero icons sit on a near-black canvas with a subtle radial accent glow.
// Row + Badge are monochrome single-color (currentColor).

// ── Accent palette — drives Hero glow + canonical text-{x} class for Row/Badge
const ACCENTS = {
  report:      { hex: '#60a5fa', tw: 'text-blue-400',   name: 'Reports'      },
  image:       { hex: '#c084fc', tw: 'text-purple-400', name: 'Images'       },
  document:    { hex: '#cbd5e1', tw: 'text-slate-300',  name: 'Documents'    },
  code:        { hex: '#34d399', tw: 'text-emerald-400',name: 'Code'         },
  slide:       { hex: '#fb923c', tw: 'text-orange-400', name: 'Slides'       },
  spreadsheet: { hex: '#4ade80', tw: 'text-green-400',  name: 'Spreadsheets' },
  blog_post:   { hex: '#22d3ee', tw: 'text-cyan-400',   name: 'Blog Posts'   },
};

// ── Hero canvas wrapper — 200×200 dark with subtle radial gradient toward accent
const HeroCanvas = ({ accent, children, id }) => {
  const gradId = `g-${id}`;
  return (
    <svg viewBox="0 0 200 200" width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={gradId} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.18" />
          <stop offset="55%" stopColor={accent} stopOpacity="0.04" />
          <stop offset="100%" stopColor="#0a0d14" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="200" height="200" rx="14" fill="#0a0d14" />
      <rect width="200" height="200" rx="14" fill={`url(#${gradId})`} />
      {children}
    </svg>
  );
};

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  HERO ICONS — 200×200, multi-element, accent + dark canvas           ║
// ╚══════════════════════════════════════════════════════════════════════╝

// REPORT — bar chart climbing + line graph overlay, inside a soft frame
const ReportHero = () => {
  const a = ACCENTS.report.hex;
  return (
    <HeroCanvas accent={a} id="report-hero">
      {/* paper frame */}
      <rect x="44" y="40" width="112" height="120" rx="6"
        fill="none" stroke="#1f2733" strokeWidth="1.5" />
      {/* baseline */}
      <line x1="56" y1="132" x2="144" y2="132" stroke="#1f2733" strokeWidth="1.25" />
      {/* bars — ascending */}
      <rect x="60" y="108" width="14" height="24" rx="1.5" fill={a} fillOpacity="0.22" stroke={a} strokeWidth="1.5" />
      <rect x="80" y="92"  width="14" height="40" rx="1.5" fill={a} fillOpacity="0.32" stroke={a} strokeWidth="1.5" />
      <rect x="100" y="76" width="14" height="56" rx="1.5" fill={a} fillOpacity="0.42" stroke={a} strokeWidth="1.5" />
      <rect x="120" y="60" width="14" height="72" rx="1.5" fill={a} fillOpacity="0.55" stroke={a} strokeWidth="1.5" />
      {/* trendline */}
      <polyline points="67,100 87,84 107,68 127,52" fill="none" stroke={a} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="127" cy="52" r="3" fill={a} />
      {/* eyebrow tick */}
      <line x1="56" y1="52" x2="64" y2="52" stroke={a} strokeWidth="2" strokeLinecap="round" />
    </HeroCanvas>
  );
};

// IMAGE — frame with horizon (mountain triangles + sun)
const ImageHero = () => {
  const a = ACCENTS.image.hex;
  return (
    <HeroCanvas accent={a} id="image-hero">
      <rect x="40" y="44" width="120" height="112" rx="6"
        fill="none" stroke="#1f2733" strokeWidth="1.5" />
      {/* sun */}
      <circle cx="124" cy="76" r="9" fill={a} fillOpacity="0.45" stroke={a} strokeWidth="1.5" />
      {/* mountain back */}
      <path d="M48,140 L82,96 L116,140 Z"
        fill={a} fillOpacity="0.18" stroke={a} strokeWidth="1.5" strokeLinejoin="round" />
      {/* mountain front */}
      <path d="M76,150 L108,108 L152,150 Z"
        fill={a} fillOpacity="0.32" stroke={a} strokeWidth="1.5" strokeLinejoin="round" />
      {/* base */}
      <line x1="48" y1="150" x2="152" y2="150" stroke="#1f2733" strokeWidth="1.25" />
    </HeroCanvas>
  );
};

// DOCUMENT — page w/ folded corner + 4 text lines
const DocumentHero = () => {
  const a = ACCENTS.document.hex;
  return (
    <HeroCanvas accent={a} id="doc-hero">
      {/* page outline w/ folded corner */}
      <path d="M58,32 L130,32 L150,52 L150,168 L58,168 Z"
        fill="none" stroke={a} strokeWidth="1.75" strokeLinejoin="round" />
      {/* corner fold */}
      <path d="M130,32 L130,52 L150,52"
        fill={a} fillOpacity="0.14" stroke={a} strokeWidth="1.5" strokeLinejoin="round" />
      {/* heading */}
      <line x1="74" y1="76"  x2="118" y2="76"  stroke={a} strokeWidth="2.5" strokeLinecap="round" />
      {/* body lines */}
      <line x1="74" y1="100" x2="134" y2="100" stroke={a} strokeOpacity="0.55" strokeWidth="1.75" strokeLinecap="round" />
      <line x1="74" y1="118" x2="134" y2="118" stroke={a} strokeOpacity="0.55" strokeWidth="1.75" strokeLinecap="round" />
      <line x1="74" y1="136" x2="110" y2="136" stroke={a} strokeOpacity="0.55" strokeWidth="1.75" strokeLinecap="round" />
    </HeroCanvas>
  );
};

// CODE — curly braces wrapping 3 stacked lines (last line indented)
const CodeHero = () => {
  const a = ACCENTS.code.hex;
  return (
    <HeroCanvas accent={a} id="code-hero">
      {/* left brace */}
      <path d="M68,44 C58,44 58,72 50,100 C58,128 58,156 68,156"
        fill="none" stroke={a} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      {/* right brace */}
      <path d="M132,44 C142,44 142,72 150,100 C142,128 142,156 132,156"
        fill="none" stroke={a} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      {/* code lines */}
      <line x1="78"  y1="84"  x2="118" y2="84"  stroke={a} strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
      <line x1="88"  y1="100" x2="122" y2="100" stroke={a} strokeWidth="2" strokeLinecap="round" />
      <line x1="78"  y1="116" x2="108" y2="116" stroke={a} strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
      {/* cursor */}
      <line x1="114" y1="116" x2="114" y2="124" stroke={a} strokeWidth="2" strokeLinecap="round" />
    </HeroCanvas>
  );
};

// SLIDE — three stacked deck cards w/ play/triangle on top
const SlideHero = () => {
  const a = ACCENTS.slide.hex;
  return (
    <HeroCanvas accent={a} id="slide-hero">
      {/* back card */}
      <rect x="48" y="56" width="100" height="68" rx="5"
        fill="#0a0d14" stroke={a} strokeOpacity="0.35" strokeWidth="1.5" />
      {/* mid card */}
      <rect x="56" y="68" width="100" height="68" rx="5"
        fill="#0a0d14" stroke={a} strokeOpacity="0.6" strokeWidth="1.5" />
      {/* front card */}
      <rect x="44" y="84" width="112" height="76" rx="6"
        fill={a} fillOpacity="0.12" stroke={a} strokeWidth="1.75" />
      {/* slide content — title bar + thumb */}
      <rect x="56" y="98" width="44" height="6" rx="2" fill={a} />
      <rect x="56" y="112" width="64" height="3" rx="1.5" fill={a} fillOpacity="0.55" />
      <rect x="56" y="120" width="52" height="3" rx="1.5" fill={a} fillOpacity="0.55" />
      <rect x="56" y="128" width="58" height="3" rx="1.5" fill={a} fillOpacity="0.55" />
      {/* play */}
      <circle cx="134" cy="124" r="13" fill={a} fillOpacity="0.18" stroke={a} strokeWidth="1.5" />
      <path d="M130,118 L130,130 L140,124 Z" fill={a} />
    </HeroCanvas>
  );
};

// SPREADSHEET — 4×4 grid w/ one cell highlighted
const SpreadsheetHero = () => {
  const a = ACCENTS.spreadsheet.hex;
  // 4×4 grid, 24px cells, starting at (52,52) = 96 wide
  const x0 = 52, y0 = 52, cell = 24;
  return (
    <HeroCanvas accent={a} id="ss-hero">
      {/* outer frame */}
      <rect x={x0} y={y0} width={cell*4} height={cell*4} rx="4"
        fill="none" stroke={a} strokeWidth="1.75" />
      {/* header row */}
      <rect x={x0} y={y0} width={cell*4} height={cell} fill={a} fillOpacity="0.15" />
      {/* highlighted cell — col 2, row 2 */}
      <rect x={x0 + cell*2} y={y0 + cell*2} width={cell} height={cell}
        fill={a} fillOpacity="0.45" />
      {/* grid lines */}
      {[1,2,3].map(i => (
        <line key={`v${i}`} x1={x0 + cell*i} y1={y0} x2={x0 + cell*i} y2={y0 + cell*4}
          stroke={a} strokeOpacity="0.45" strokeWidth="1.25" />
      ))}
      {[1,2,3].map(i => (
        <line key={`h${i}`} x1={x0} y1={y0 + cell*i} x2={x0 + cell*4} y2={y0 + cell*i}
          stroke={a} strokeOpacity="0.45" strokeWidth="1.25" />
      ))}
      {/* sparkline ticks in header */}
      <circle cx={x0 + cell*0.5} cy={y0 + cell*0.5} r="2" fill={a} />
      <circle cx={x0 + cell*1.5} cy={y0 + cell*0.5} r="2" fill={a} />
      <circle cx={x0 + cell*2.5} cy={y0 + cell*0.5} r="2" fill={a} />
      <circle cx={x0 + cell*3.5} cy={y0 + cell*0.5} r="2" fill={a} />
    </HeroCanvas>
  );
};

// BLOG POST — page w/ banner image area + headline + 3 paragraph lines
const BlogPostHero = () => {
  const a = ACCENTS.blog_post.hex;
  return (
    <HeroCanvas accent={a} id="blog-hero">
      {/* page */}
      <rect x="44" y="36" width="112" height="128" rx="6"
        fill="none" stroke={a} strokeWidth="1.75" />
      {/* banner image area w/ horizon */}
      <rect x="56" y="48" width="88" height="40" rx="3"
        fill={a} fillOpacity="0.18" stroke={a} strokeOpacity="0.7" strokeWidth="1.25" />
      <circle cx="74" cy="64" r="4" fill={a} />
      <path d="M60,86 L82,72 L102,84 L122,68 L140,86"
        fill="none" stroke={a} strokeWidth="1.5" strokeLinejoin="round" />
      {/* headline */}
      <rect x="56" y="100" width="60" height="6" rx="2" fill={a} />
      {/* body */}
      <line x1="56" y1="120" x2="144" y2="120" stroke={a} strokeOpacity="0.55" strokeWidth="1.75" strokeLinecap="round" />
      <line x1="56" y1="134" x2="144" y2="134" stroke={a} strokeOpacity="0.55" strokeWidth="1.75" strokeLinecap="round" />
      <line x1="56" y1="148" x2="116" y2="148" stroke={a} strokeOpacity="0.55" strokeWidth="1.75" strokeLinecap="round" />
    </HeroCanvas>
  );
};

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  ROW ICONS — 24×24, lucide-grade, currentColor, stroke 1.5           ║
// ╚══════════════════════════════════════════════════════════════════════╝

const rowProps = {
  width: 24, height: 24, viewBox: '0 0 24 24',
  fill: 'none', stroke: 'currentColor', strokeWidth: 1.5,
  strokeLinecap: 'round', strokeLinejoin: 'round',
  xmlns: 'http://www.w3.org/2000/svg',
};

const ReportRow = () => (
  <svg {...rowProps}>
    {/* small bar chart — 3 ascending bars + axis */}
    <line x1="4" y1="20" x2="20" y2="20" />
    <rect x="6"  y="14" width="3" height="6" rx="0.5" />
    <rect x="11" y="10" width="3" height="10" rx="0.5" />
    <rect x="16" y="6"  width="3" height="14" rx="0.5" />
  </svg>
);

const ImageRow = () => (
  <svg {...rowProps}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="M21 16l-5-5-9 9" />
  </svg>
);

const DocumentRow = () => (
  <svg {...rowProps}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <line x1="9"  y1="13" x2="15" y2="13" />
    <line x1="9"  y1="17" x2="13" y2="17" />
  </svg>
);

const CodeRow = () => (
  <svg {...rowProps}>
    {/* curly-braces with inner cursor */}
    <path d="M8 4c-2 0-3 1-3 3v2c0 1.5-.7 3-2 3 1.3 0 2 1.5 2 3v2c0 2 1 3 3 3" />
    <path d="M16 4c2 0 3 1 3 3v2c0 1.5.7 3 2 3-1.3 0-2 1.5-2 3v2c0 2-1 3-3 3" />
  </svg>
);

const SlideRow = () => (
  <svg {...rowProps}>
    {/* stacked deck */}
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <line x1="6" y1="3" x2="18" y2="3" strokeOpacity="0.55" />
    <path d="M10 10v5l5-2.5z" fill="currentColor" stroke="none" />
  </svg>
);

const SpreadsheetRow = () => (
  <svg {...rowProps}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3"  y1="9"  x2="21" y2="9" />
    <line x1="3"  y1="15" x2="21" y2="15" />
    <line x1="9"  y1="3"  x2="9"  y2="21" />
    <line x1="15" y1="3"  x2="15" y2="21" />
  </svg>
);

const BlogPostRow = () => (
  <svg {...rowProps}>
    {/* page w/ banner image rectangle on top */}
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <rect x="7" y="6" width="10" height="5" rx="0.75" />
    <line x1="7"  y1="14" x2="17" y2="14" />
    <line x1="7"  y1="17" x2="13" y2="17" />
  </svg>
);

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  BADGE ICONS — 16×16, redrawn for clarity (NOT scaled-down 24px)      ║
// ╚══════════════════════════════════════════════════════════════════════╝

const badgeProps = {
  width: 16, height: 16, viewBox: '0 0 16 16',
  fill: 'none', stroke: 'currentColor', strokeWidth: 1.5,
  strokeLinecap: 'round', strokeLinejoin: 'round',
  xmlns: 'http://www.w3.org/2000/svg',
};

const ReportBadge = () => (
  <svg {...badgeProps}>
    <line x1="2" y1="13.25" x2="14" y2="13.25" />
    <rect x="3.5"  y="9"  width="2.5" height="4.25" rx="0.5" />
    <rect x="6.75" y="6"  width="2.5" height="7.25" rx="0.5" />
    <rect x="10"   y="3"  width="2.5" height="10.25" rx="0.5" />
  </svg>
);

const ImageBadge = () => (
  <svg {...badgeProps}>
    <rect x="2" y="3" width="12" height="10" rx="1.5" />
    <circle cx="5.5" cy="6.5" r="1" />
    <path d="M14 10.5l-3-3-5.5 5.5" />
  </svg>
);

const DocumentBadge = () => (
  <svg {...badgeProps}>
    <path d="M9.5 2H4.5a1.5 1.5 0 0 0-1.5 1.5v9a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5V5.5z" />
    <path d="M9.5 2v3.5h3.5" />
    <line x1="5.5" y1="9"  x2="10.5" y2="9" />
    <line x1="5.5" y1="11.5" x2="9"   y2="11.5" />
  </svg>
);

const CodeBadge = () => (
  <svg {...badgeProps}>
    <path d="M5.5 3c-1.25 0-2 .6-2 1.75v1.5c0 .9-.5 1.75-1.25 1.75.75 0 1.25.85 1.25 1.75v1.5C3.5 12.4 4.25 13 5.5 13" />
    <path d="M10.5 3c1.25 0 2 .6 2 1.75v1.5c0 .9.5 1.75 1.25 1.75-.75 0-1.25.85-1.25 1.75v1.5C12.5 12.4 11.75 13 10.5 13" />
  </svg>
);

const SlideBadge = () => (
  <svg {...badgeProps}>
    <rect x="2" y="4" width="12" height="9" rx="1.5" />
    <line x1="4" y1="2" x2="12" y2="2" strokeOpacity="0.55" />
    <path d="M6.75 7v3l3-1.5z" fill="currentColor" stroke="none" />
  </svg>
);

const SpreadsheetBadge = () => (
  <svg {...badgeProps}>
    <rect x="2" y="2" width="12" height="12" rx="1.5" />
    <line x1="2"  y1="6"  x2="14" y2="6" />
    <line x1="2"  y1="10" x2="14" y2="10" />
    <line x1="6"  y1="2"  x2="6"  y2="14" />
    <line x1="10" y1="2"  x2="10" y2="14" />
  </svg>
);

const BlogPostBadge = () => (
  <svg {...badgeProps}>
    <rect x="2.5" y="2" width="11" height="12" rx="1.5" />
    <rect x="4.5" y="4" width="7"  height="3.5" rx="0.5" />
    <line x1="4.5" y1="9.5"  x2="11.5" y2="9.5" />
    <line x1="4.5" y1="11.75" x2="9"    y2="11.75" />
  </svg>
);

// ── Lookup tables for the showcase

const HERO = {
  report: ReportHero, image: ImageHero, document: DocumentHero,
  code: CodeHero, slide: SlideHero, spreadsheet: SpreadsheetHero, blog_post: BlogPostHero,
};
const ROW = {
  report: ReportRow, image: ImageRow, document: DocumentRow,
  code: CodeRow, slide: SlideRow, spreadsheet: SpreadsheetRow, blog_post: BlogPostRow,
};
const BADGE = {
  report: ReportBadge, image: ImageBadge, document: DocumentBadge,
  code: CodeBadge, slide: SlideBadge, spreadsheet: SpreadsheetBadge, blog_post: BlogPostBadge,
};

Object.assign(window, { ACCENTS, HERO, ROW, BADGE });
