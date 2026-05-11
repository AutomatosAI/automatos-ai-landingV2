/**
 * Automatos v2 — hero image picker (dev / preview tool).
 *
 * Renders a small floating tray of hero-image thumbnails in the bottom-right corner.
 * Click a thumbnail → applies that image to #heroPhoto and persists in localStorage.
 *
 * Keyboard:
 *   [   previous hero
 *   ]   next hero
 *   ?   toggle tray visibility
 *
 * The picker is intentionally landing-only (the hero element lives on index.html).
 * Drop new images into /images/ and add them to HEROES below.
 */
(function () {
  const STORAGE_KEY = 'automatos-hero';
  const HEROES = [
    { id: 'lighthouse',        label: 'Beam · forest',      src: 'images/forest-lighthouse.png' },
    { id: 'ship',              label: 'Ship · storm',       src: 'images/ship.jpeg' },
    { id: 'lighthouse-forest', label: 'Tower · woods',      src: 'images/lighthouse-forest.jpeg' },
    { id: 'boat-wide',         label: 'Boat · wide',        src: 'images/boat-wide.jpeg' },
    { id: 'ship-lighthouse',   label: 'Tall ship · cliff',  src: 'images/ship-lighthouse.jpeg' },
    { id: 'portal-forest',     label: 'Portal · forest',    src: 'images/portal-forest.jpeg' },
    { id: 'valley',            label: 'Valley · misty',     src: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=400&q=70&auto=format&fit=crop' },
    { id: 'forest',            label: 'Forest · green',     src: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&q=70&auto=format&fit=crop' },
    { id: 'reflect',           label: 'Reflection · still', src: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&q=70&auto=format&fit=crop' },
    { id: 'dunes',             label: 'Dunes · sand',       src: 'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?w=400&q=70&auto=format&fit=crop' },
  ];

  function $hero() { return document.getElementById('heroPhoto'); }

  function getStored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (_) { return null; }
  }
  function setStored(v) {
    try { localStorage.setItem(STORAGE_KEY, v); } catch (_) {}
  }

  function currentIndex() {
    const cur = ($hero() && $hero().getAttribute('data-photo')) || getStored() || HEROES[0].id;
    const i = HEROES.findIndex(h => h.id === cur);
    return i < 0 ? 0 : i;
  }

  function apply(id) {
    const hero = $hero();
    if (!hero) return;
    hero.setAttribute('data-photo', id);
    setStored(id);
    document.querySelectorAll('.hp-thumb').forEach(t => {
      t.classList.toggle('is-active', t.dataset.id === id);
    });
  }

  function cycle(delta) {
    const i = currentIndex();
    const next = HEROES[(i + delta + HEROES.length) % HEROES.length];
    apply(next.id);
  }

  function injectStyles() {
    const css = [
      '#hero-picker {',
      '  position: fixed; left: 16px; bottom: 60px; z-index: 9998;',
      '  display: flex; gap: 8px; align-items: flex-end;',
      '  font: 500 10px/1 "Geist Mono", ui-monospace, monospace;',
      '  letter-spacing: 0.16em; text-transform: uppercase;',
      '}',
      '#hero-picker.is-hidden .hp-tray { display: none; }',
      '.hp-toggle {',
      '  padding: 8px 12px;',
      '  background: var(--bg-2, #ECE6D9);',
      '  color: var(--fg, #0F1411);',
      '  border: 1px solid var(--rule-strong, #B6AE99);',
      '  border-radius: 999px;',
      '  cursor: pointer;',
      '  white-space: nowrap;',
      '}',
      '.hp-toggle:hover { border-color: var(--fg, #0F1411); }',
      '.hp-tray {',
      '  display: flex; gap: 6px; padding: 8px;',
      '  background: var(--bg-2, #ECE6D9);',
      '  border: 1px solid var(--rule-strong, #B6AE99);',
      '  border-radius: 12px;',
      '  max-width: 70vw; overflow-x: auto;',
      '}',
      '.hp-thumb {',
      '  display: grid; gap: 4px; padding: 0;',
      '  background: transparent; border: 0; cursor: pointer;',
      '  font: inherit; color: inherit;',
      '}',
      '.hp-thumb img {',
      '  display: block; width: 72px; height: 42px;',
      '  object-fit: cover; border-radius: 4px;',
      '  border: 2px solid transparent;',
      '  transition: border-color .12s, transform .12s;',
      '}',
      '.hp-thumb:hover img { transform: translateY(-1px); }',
      '.hp-thumb.is-active img { border-color: var(--accent, #5B7C68); }',
      '.hp-thumb span {',
      '  font-size: 9px; color: var(--muted, #8A8B83);',
      '  text-align: left;',
      '}',
      '.hp-thumb.is-active span { color: var(--fg, #0F1411); }',
      '@media print { #hero-picker { display: none; } }'
    ].join('\n');
    const style = document.createElement('style');
    style.id = 'hero-picker-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function build() {
    if (!$hero()) return;
    if (document.getElementById('hero-picker')) return;

    const root = document.createElement('div');
    root.id = 'hero-picker';
    root.className = 'is-hidden';

    const tray = document.createElement('div');
    tray.className = 'hp-tray';
    HEROES.forEach(h => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hp-thumb';
      btn.dataset.id = h.id;
      btn.title = h.label;

      const img = document.createElement('img');
      img.alt = '';
      img.src = h.src;
      img.loading = 'lazy';

      const label = document.createElement('span');
      label.textContent = h.label;

      btn.appendChild(img);
      btn.appendChild(label);
      btn.addEventListener('click', () => apply(h.id));
      tray.appendChild(btn);
    });

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'hp-toggle';
    toggle.textContent = 'Hero ↕';
    toggle.addEventListener('click', () => {
      root.classList.toggle('is-hidden');
    });

    root.appendChild(tray);
    root.appendChild(toggle);
    document.body.appendChild(root);

    apply(getStored() || $hero().getAttribute('data-photo') || HEROES[0].id);
  }

  function wireKeys() {
    document.addEventListener('keydown', (e) => {
      if (e.target && (e.target.matches('input,textarea,[contenteditable]'))) return;
      if (e.key === '[') { cycle(-1); }
      else if (e.key === ']') { cycle(1); }
      else if (e.key === '?') {
        const r = document.getElementById('hero-picker');
        if (r) r.classList.toggle('is-hidden');
      }
    });
  }

  function init() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    if (!document.getElementById('heroPhoto')) return; // landing-only
    injectStyles();
    build();
    wireKeys();
  }

  init();
})();
