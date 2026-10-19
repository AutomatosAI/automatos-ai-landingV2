/**
 * Automatos v2 — the family footer (automatos.app).
 *
 * One footer for every page: each page carries `<div data-site-footer></div>`
 * and this script renders into it. Edit here and every page picks up the
 * change (the same pattern as _nav.js).
 *
 * The family footer rules (Studio REDESIGN-PLAN §9, 6–8 Oct 2026):
 *   - the same skeleton on every Automatos site, each in its own skin;
 *   - one copyright line, "© 2026 Automatos AI";
 *   - the family column appears on automatos.app only: product sites carry a
 *     single "Powered by Automatos AI" pill that links here;
 *   - the same social icons in the same order (X, Instagram, LinkedIn,
 *     GitHub); legal links point to the one canonical set on this site.
 *
 * Styled from the host page's own variables (--bg, --fg, --muted, --rule-c,
 * --serif, --mono, --gutter), so it follows the page's mood.
 */
(function () {
  if (window.__automatosFooter) return;
  window.__automatosFooter = true;

  const COLUMNS = [
    {
      title: 'The family',
      links: [
        { label: 'Automatos Studio', href: 'https://studio.automatos.app/#waitlist', external: true },
        { label: 'Academy', href: 'https://academy.automatos.app', external: true },
        { label: 'Automatos Markets', href: 'https://markets.automatos.app', external: true },
        { label: 'Widgets & Shopify', href: '/#family' },
        { label: 'Enterprise', href: '/#editions' },
      ],
      partners: ['BudStacks', 'Shopify partners'],
    },
    {
      title: 'Developers',
      links: [
        { label: 'Documentation', href: 'https://docs.automatos.app/', external: true },
        { label: 'GitHub', href: 'https://github.com/AutomatosAI/automatos-ai', external: true },
        { label: 'DeepWiki', href: 'https://deepwiki.com/AutomatosAI/automatos-ai', external: true },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'Field notes', href: '/field-notes' },
        { label: 'Research', href: '/research' },
        { label: 'Contact', href: '/contact' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
        { label: 'Cookie Policy', href: '/cookies' },
        { label: 'EU AI Act', href: '/eu-ai-act' },
      ],
    },
  ];

  const SOCIAL = [
    { label: 'X (Twitter)', href: 'https://x.com/automatosai', d: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
    { label: 'Instagram', href: 'https://www.instagram.com/automatosai', d: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/automatos-ai', d: 'M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z' },
    { label: 'GitHub', href: 'https://github.com/AutomatosAI/automatos-ai', d: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12' },
  ];

  const CSS = `
.sf { border-top: 1px solid var(--rule-c); padding: 72px var(--gutter, 56px) 36px; display: grid; grid-template-columns: 1.4fr repeat(4, 1fr); gap: 40px; color: var(--fg); background: var(--bg); }
.sf a { color: inherit; text-decoration: none; }
.sf-brand { display: grid; gap: 18px; align-content: start; }
.sf-mark { display: inline-flex; align-items: center; gap: 10px; font-family: var(--serif); font-size: 26px; letter-spacing: -0.01em; }
.sf-mark i { width: 24px; height: 24px; background: url("/images/automatos-mark-black.png") center/contain no-repeat; display: inline-block; }
body[data-mood="pitch"] .sf-mark i { background-image: url("/images/automatos-mark-white.png"); }
.sf-mark em { font-style: italic; color: var(--muted); }
.sf-tag { font-family: var(--serif); font-size: 22px; line-height: 1.2; color: var(--fg); max-width: 22ch; }
.sf-tag em { font-style: italic; color: var(--muted); }
.sf-note { font-size: 13px; line-height: 1.55; color: var(--muted); max-width: 34ch; }
.sf-col h6 { font-family: var(--mono); font-size: 11px; font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); margin: 0 0 16px; }
.sf-col ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; font-size: 14px; }
.sf-col a:hover { text-decoration: underline; text-underline-offset: 3px; }
.sf-col .sf-ext::after { content: " ↗"; color: var(--muted); font-size: 12px; }
.sf-partners { margin-top: 18px; font-size: 13px; color: var(--muted); }
.sf-partners b { display: block; font-family: var(--mono); font-size: 10px; font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase; margin-bottom: 6px; }
.sf-foot { grid-column: 1 / -1; border-top: 1px solid var(--rule-c); padding-top: 22px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; font-family: var(--mono); font-size: 11px; letter-spacing: 0.08em; color: var(--muted); }
.sf-social { display: flex; gap: 18px; }
.sf-social a { color: var(--muted); }
.sf-social a:hover { color: var(--fg); }
.sf-social svg { width: 18px; height: 18px; display: block; }
@media (max-width: 1080px) { .sf { grid-template-columns: repeat(2, 1fr); padding: 56px 24px 28px; } .sf-brand { grid-column: 1 / -1; } }
@media (max-width: 560px) { .sf { grid-template-columns: 1fr; } }
`;

  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'text') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach((c) => { if (c) n.appendChild(c); });
    return n;
  }

  function link(item) {
    const attrs = { href: item.href, text: item.label };
    if (item.external) Object.assign(attrs, { target: '_blank', rel: 'noopener', class: 'sf-ext' });
    return el('li', null, [el('a', attrs)]);
  }

  function column(col) {
    const kids = [el('h6', { text: col.title }), el('ul', null, col.links.map(link))];
    if (col.partners) {
      const p = el('div', { class: 'sf-partners' }, [el('b', { text: 'Partners' })]);
      p.appendChild(document.createTextNode(col.partners.join(' · ')));
      kids.push(p);
    }
    return el('div', { class: 'sf-col' }, kids);
  }

  function brand() {
    const mark = el('a', { class: 'sf-mark', href: '/', 'aria-label': 'Automatos AI home' }, [el('i')]);
    mark.appendChild(document.createTextNode('Automatos'));
    mark.appendChild(el('em', { text: '·ai' }));
    const tag = el('p', { class: 'sf-tag' });
    tag.appendChild(document.createTextNode('One OS. '));
    tag.appendChild(el('em', { text: 'Any interface.' }));
    const note = el('p', { class: 'sf-note', text: 'Automatos OS is the open-source engine. Studio, Academy and Markets run on it, and so can your own app.' });
    return el('div', { class: 'sf-brand' }, [mark, tag, note]);
  }

  function social() {
    const NS = 'http://www.w3.org/2000/svg';
    return el('div', { class: 'sf-social' }, SOCIAL.map((s) => {
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'currentColor');
      svg.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', s.d);
      svg.appendChild(path);
      return el('a', { href: s.href, target: '_blank', rel: 'noopener', 'aria-label': s.label }, [svg]);
    }));
  }

  function render(slot) {
    const foot = el('div', { class: 'sf-foot' }, [
      el('span', { text: '© 2026 Automatos AI · Automatos OS is open source under Apache 2.0' }),
      social(),
    ]);
    const footer = el('footer', { class: 'sf', 'aria-label': 'Site footer' }, [brand(), ...COLUMNS.map(column), foot]);
    slot.replaceWith(footer);
  }

  function init() {
    if (!document.getElementById('sf-style')) {
      document.head.appendChild(el('style', { id: 'sf-style', text: CSS }));
    }
    document.querySelectorAll('[data-site-footer]').forEach(render);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
