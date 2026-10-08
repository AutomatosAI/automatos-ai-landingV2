/**
 * Automatos v2 — the family hub (the home hero's figure).
 *
 * Automatos OS in the middle, three rings around it:
 *   inner  · the OS modules            (muted, mono)
 *   middle · what you run in Studio    (ink)
 *   outer  · everything Powered by Automatos AI (accent)
 * Spokes draw in, the rings' dots appear in turn, and pulses travel from the
 * centre to the outer ring: one OS driving every interface.
 *
 * A plain-JS port of the Studio site's OsHub with its FAMILY_RINGS
 * (automatos-ai-landing src/components/sections/OsHub.tsx + osHubRings.ts,
 * REDESIGN-PLAN §7: "FAMILY_RINGS is the hero for automatos.app"). Coloured
 * from this page's own variables (--fg, --muted, --accent, --rule-c, --bg).
 * Under 760px the rings become three labelled chip groups; with reduced
 * motion nothing moves.
 */
(function () {
  const RINGS = [
    { key: 'os', title: 'The OS', rx: 175, ry: 112, startDeg: -67.5, colour: 'var(--muted)', font: 'var(--mono)', size: 13, weight: 500,
      items: ['Auto', 'Agents', 'Memory', 'RAG', 'NL2SQL', 'Graphs', 'Analytics', 'Harness'] },
    { key: 'studio', title: 'Run it in Studio', rx: 310, ry: 200, startDeg: -90, colour: 'var(--fg)', font: 'var(--sans)', size: 14, weight: 400,
      items: ['Board', 'Calendar', 'Socials', 'Documents', 'Templates', 'Brand kit', 'Missions', 'Playbooks', 'Marketplace'] },
    { key: 'outlets', title: 'Powered by Automatos AI', rx: 445, ry: 282, startDeg: -112.5, colour: 'var(--accent)', font: 'var(--sans)', size: 16, weight: 600,
      items: ['Studio', 'Academy', 'Market Intelligence', 'Shopify', 'Widgets', 'BudStacks', 'Enterprise', 'Your app · API · MCP'] },
  ];
  const W = 1000, H = 660, CX = W / 2, CY = H / 2, PAD = 120;
  const NS = 'http://www.w3.org/2000/svg';
  const MARK = 'M41 67.2 3.3 67.4.4 60.2 55 55.6zM22.4 54.2C14.3 53.9 9.6 54.2 0 55 5.5 45.8 17.5 24.8 21 14.6zM27.1 0c11.2 20 24.8 44.6 27.4 50-9.7.8-15.6 1.4-25.5 2.8z';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function svgEl(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function layout() {
    const nodes = [];
    let order = 0;
    RINGS.forEach((ring) => {
      const step = 360 / ring.items.length;
      ring.items.forEach((label, i) => {
        const a = ((ring.startDeg + i * step) * Math.PI) / 180;
        const cos = Math.cos(a), sin = Math.sin(a);
        const x = CX + ring.rx * cos, y = CY + ring.ry * sin;
        const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
        const lx = anchor === 'middle' ? x : x + (cos > 0 ? 12 : -12);
        const ly = anchor === 'middle' ? y + (sin > 0 ? 24 : -14) : y + 5;
        nodes.push({ ring, label, x, y, anchor, lx, ly, order: order++ });
      });
    });
    return nodes;
  }

  function ringsAndSpokes(svg, nodes) {
    RINGS.forEach((r, i) => {
      svgEl('ellipse', { cx: CX, cy: CY, rx: r.rx, ry: r.ry, fill: 'none', stroke: 'var(--rule-strong, var(--rule-c))', 'stroke-width': 1,
        'stroke-dasharray': '2 6', class: 'hub-fade', style: `animation-delay:${0.2 + i * 0.25}s` }, svg);
    });
    nodes.forEach((n) => {
      const len = Math.hypot(n.x - CX, n.y - CY);
      svgEl('line', { x1: CX, y1: CY, x2: n.x.toFixed(1), y2: n.y.toFixed(1), stroke: 'var(--muted)',
        'stroke-opacity': n.ring.key === 'outlets' ? 0.32 : 0.18, 'stroke-width': 1, class: 'hub-spoke',
        style: `--len:${len.toFixed(0)};stroke-dasharray:${len.toFixed(0)};animation-delay:${0.6 + n.order * 0.05}s` }, svg);
    });
  }

  function pulses(svg, nodes) {
    if (reduce) return;
    nodes.filter((n) => n.ring.key === 'outlets').forEach((n, i) => {
      const dot = svgEl('circle', { r: 3.2, cx: CX, cy: CY, fill: 'var(--accent)', opacity: 0 }, svg);
      const begin = `${(2.6 + i * 0.35).toFixed(2)}s`;
      svgEl('animate', { attributeName: 'cx', values: `${CX};${n.x.toFixed(1)}`, dur: '2.2s', begin, repeatCount: 'indefinite' }, dot);
      svgEl('animate', { attributeName: 'cy', values: `${CY};${n.y.toFixed(1)}`, dur: '2.2s', begin, repeatCount: 'indefinite' }, dot);
      svgEl('animate', { attributeName: 'opacity', values: '0;1;1;0', keyTimes: '0;0.15;0.85;1', dur: '2.2s', begin, repeatCount: 'indefinite' }, dot);
    });
  }

  function labels(svg, nodes) {
    nodes.forEach((n) => {
      const outer = n.ring.key === 'outlets';
      const g = svgEl('g', { class: 'hub-pop', style: `transform-origin:${n.x.toFixed(1)}px ${n.y.toFixed(1)}px;animation-delay:${0.8 + n.order * 0.05}s` }, svg);
      svgEl('circle', { cx: n.x.toFixed(1), cy: n.y.toFixed(1), r: outer ? 7 : 5, fill: 'var(--bg)', stroke: n.ring.colour, 'stroke-width': 2 }, g);
      svgEl('circle', { cx: n.x.toFixed(1), cy: n.y.toFixed(1), r: outer ? 3 : 2, fill: n.ring.colour }, g);
      const t = svgEl('text', { x: n.lx.toFixed(1), y: n.ly.toFixed(1), 'text-anchor': n.anchor,
        fill: n.ring.key === 'os' ? 'var(--muted)' : 'var(--fg)',
        style: `font-family:${n.ring.font};font-size:${n.ring.size}px;font-weight:${n.ring.weight}` }, g);
      t.textContent = n.label;
    });
  }

  function centre(svg) {
    const g = svgEl('g', { class: 'hub-pop', style: `transform-origin:${CX}px ${CY}px` }, svg);
    if (!reduce) {
      const halo = svgEl('circle', { cx: CX, cy: CY, r: 74, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1 }, g);
      svgEl('animate', { attributeName: 'r', values: '72;104', dur: '3s', repeatCount: 'indefinite' }, halo);
      svgEl('animate', { attributeName: 'opacity', values: '0.55;0', dur: '3s', repeatCount: 'indefinite' }, halo);
    }
    svgEl('circle', { cx: CX, cy: CY, r: 70, fill: 'var(--bg-2, var(--bg))', stroke: 'var(--rule-strong, var(--rule-c))', 'stroke-width': 1.5 }, g);
    svgEl('path', { d: MARK, fill: 'var(--fg)', transform: `translate(${CX - 16} ${CY - 44}) scale(0.58)` }, g);
    const t1 = svgEl('text', { x: CX, y: CY + 24, 'text-anchor': 'middle', fill: 'var(--fg)', style: 'font-family:var(--serif);font-size:21px' }, g);
    t1.textContent = 'Automatos';
    const t2 = svgEl('text', { x: CX, y: CY + 42, 'text-anchor': 'middle', fill: 'var(--accent)', style: 'font-family:var(--mono);font-size:11px;letter-spacing:2px' }, g);
    t2.textContent = 'OS';
  }

  function figure() {
    const svg = svgEl('svg', { viewBox: `${-PAD} 0 ${W + PAD * 2} ${H + 10}`, class: 'hub-svg', role: 'img',
      'aria-label': 'Automatos OS at the centre. Inner ring: the OS modules. Middle ring: what you run in Studio. Outer ring: every product and partner powered by Automatos AI.' });
    const nodes = layout();
    ringsAndSpokes(svg, nodes);
    pulses(svg, nodes);
    labels(svg, nodes);
    centre(svg);
    return svg;
  }

  function chips() {
    const wrap = document.createElement('div');
    wrap.className = 'hub-chips';
    [...RINGS].reverse().forEach((ring) => {
      const group = document.createElement('div');
      const title = document.createElement('p');
      title.className = 'hub-chips-title';
      title.textContent = ring.title;
      const row = document.createElement('div');
      row.className = 'hub-chips-row';
      ring.items.forEach((label) => {
        const chip = document.createElement('span');
        chip.className = 'hub-chip';
        chip.style.setProperty('--dot', ring.colour);
        chip.textContent = label;
        row.appendChild(chip);
      });
      group.append(title, row);
      wrap.appendChild(group);
    });
    return wrap;
  }

  function legend() {
    const wrap = document.createElement('div');
    wrap.className = 'hub-legend';
    wrap.setAttribute('aria-hidden', 'true');
    [...RINGS].reverse().forEach((ring) => {
      const item = document.createElement('span');
      item.style.setProperty('--dot', ring.colour);
      item.textContent = ring.title;
      wrap.appendChild(item);
    });
    return wrap;
  }

  function init() {
    document.querySelectorAll('[data-family-hub]').forEach((host) => {
      if (host.dataset.ready) return;
      host.dataset.ready = '1';
      if (reduce) host.classList.add('hub-still');
      host.append(figure(), chips(), legend());
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
