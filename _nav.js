/**
 * Automatos v2 — mobile/tablet nav drawer.
 *
 * Injects a hamburger button into every page's topbar and a slide-in
 * drawer with the full nav + utility links. Drawer styles live in
 * _responsive.css under `.nav-drawer`. Toggle button shows only at
 * widths ≤ 1080px via CSS.
 *
 * Behaviour
 *   - Tap hamburger → opens drawer + locks body scroll
 *   - Tap scrim / × / hit Escape → closes drawer
 *   - Tap a drawer link → closes drawer (lets the navigation happen)
 *   - Theme-aware via host CSS variables, no JS theming needed
 *   - Idempotent: re-inits won't duplicate DOM
 */
(function () {
  if (window.__automatosNav) return;
  window.__automatosNav = true;

  // Canonical nav — mirrors the desktop topbar across pages. Edit here
  // and every page picks up the change.
  const NAV_ITEMS = [
    { num: '/01', label: 'Platform',     href: '/',               em: null },
    { num: '/02', label: 'Marketplace',  href: '/marketplace',    em: null },
    { num: '/03', label: 'Pricing',      href: '/pricing',        em: null },
    { num: '/04', label: 'Docs',         href: 'https://docs.automatos.app/', em: null, external: true },
    { num: '/05', label: 'Academy',      href: '/academy',        em: null },
    { num: '/06', label: 'Field',        href: '/field-notes',    em: 'notes' },
  ];

  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'style') n.setAttribute('style', attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    if (kids) kids.forEach(c => { if (c) n.appendChild(c); });
    return n;
  }

  function currentPath() {
    const p = window.location.pathname.replace(/\/+$/, '') || '/';
    // strip .html for clean-URL comparison
    return p.replace(/\.html$/, '') || '/';
  }
  function isCurrent(href) {
    if (!href || href.startsWith('http')) return false;
    const h = href.replace(/\/+$/, '') || '/';
    return currentPath() === h;
  }

  function buildToggle() {
    if (document.querySelector('.nav-toggle')) return null;
    const btn = el('button', {
      type: 'button',
      class: 'nav-toggle',
      'aria-label': 'Open menu',
      'aria-expanded': 'false',
      'aria-controls': 'nav-drawer',
    });
    return btn;
  }

  function buildDrawer() {
    if (document.getElementById('nav-drawer')) return document.getElementById('nav-drawer');

    const closeBtn = el('button', {
      type: 'button',
      class: 'nav-drawer__close',
      'aria-label': 'Close menu',
      text: '×',
    });

    const head = el('div', { class: 'nav-drawer__head' }, [
      el('span', { text: 'Menu · Automatos' }),
      closeBtn,
    ]);

    const list = el('nav', { class: 'nav-drawer__list', 'aria-label': 'Primary' });
    NAV_ITEMS.forEach(item => {
      const numSpan = el('span', { class: 'num', text: item.num });
      const labelSpan = el('span');
      labelSpan.appendChild(document.createTextNode(item.em ? item.label + ' ' : item.label));
      if (item.em) {
        const em = document.createElement('em');
        em.textContent = item.em;
        labelSpan.appendChild(em);
      }
      const aAttrs = { href: item.href };
      if (item.external) { aAttrs.target = '_blank'; aAttrs.rel = 'noopener'; }
      if (isCurrent(item.href)) aAttrs['aria-current'] = 'page';
      const a = el('a', aAttrs, [numSpan, labelSpan]);
      list.appendChild(a);
    });

    const foot = el('div', { class: 'nav-drawer__foot' }, [
      el('a', { href: 'https://ui.automatos.app/sign-in', text: 'Sign in' }),
      (function () {
        const a = el('a', { class: 'solid', href: '#', 'data-waitlist': '' });
        a.appendChild(document.createTextNode('Start free '));
        const arr = document.createElement('span');
        arr.textContent = '→';
        arr.style.fontFamily = 'var(--serif)';
        arr.style.fontSize = '14px';
        a.appendChild(arr);
        return a;
      })(),
      el('div', { class: 'nav-drawer__meta' }, [
        el('span', { text: 'v1.36.04' }),
        el('span', { text: 'Apache · 2.0' }),
      ]),
    ]);

    const panel = el('div', { class: 'nav-drawer__panel' }, [head, list, foot]);
    const scrim = el('div', { class: 'nav-drawer__scrim', 'aria-hidden': 'true' });

    const drawer = el('div', {
      class: 'nav-drawer',
      id: 'nav-drawer',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Site menu',
      'data-open': 'false',
    }, [scrim, panel]);

    document.body.appendChild(drawer);
    return drawer;
  }

  function open() {
    const drawer = document.getElementById('nav-drawer');
    const toggle = document.querySelector('.nav-toggle');
    if (!drawer || !toggle) return;
    drawer.setAttribute('data-open', 'true');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('has-nav-open');
    // Move focus to close button for keyboard users
    setTimeout(() => {
      const c = drawer.querySelector('.nav-drawer__close');
      if (c) c.focus();
    }, 80);
  }
  function close() {
    const drawer = document.getElementById('nav-drawer');
    const toggle = document.querySelector('.nav-toggle');
    if (!drawer || !toggle) return;
    drawer.setAttribute('data-open', 'false');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('has-nav-open');
    toggle.focus();
  }
  function isOpen() {
    const d = document.getElementById('nav-drawer');
    return d && d.getAttribute('data-open') === 'true';
  }

  function attach() {
    // Find a host cell for the hamburger. Two known topbar shapes:
    //   .topbar  > [brand] [nav] [utilities]   — most v2 pages
    //   .header-row > [brand] [nav] [utilities] — index.html
    // Prefer the explicit .utilities container, fall back to topbar's last cell.
    let utilCell = document.querySelector('.utilities');
    if (!utilCell) {
      const topbar = document.querySelector('.topbar') || document.querySelector('.header-row');
      if (!topbar) return; // no topbar on this page
      const cells = topbar.children;
      utilCell = cells.length >= 2 ? cells[cells.length - 1] : null;
    }
    if (!utilCell) return;

    const toggle = buildToggle();
    if (toggle) utilCell.appendChild(toggle);

    const drawer = buildDrawer();

    // Wire events
    const t = document.querySelector('.nav-toggle');
    if (t) t.addEventListener('click', () => { isOpen() ? close() : open(); });

    drawer.querySelector('.nav-drawer__close')?.addEventListener('click', close);
    drawer.querySelector('.nav-drawer__scrim')?.addEventListener('click', close);

    drawer.querySelectorAll('.nav-drawer__list a').forEach(a => {
      a.addEventListener('click', () => { setTimeout(close, 0); });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) close();
    });

    // If the viewport gets wide enough, force-close
    const mq = window.matchMedia('(min-width: 1081px)');
    if (mq.addEventListener) mq.addEventListener('change', e => { if (e.matches) close(); });
    else if (mq.addListener) mq.addListener(e => { if (e.matches) close(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();
