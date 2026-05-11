/**
 * Automatos v2 — bone/pitch mode toggle.
 *
 * On first visit: respects prefers-color-scheme.
 * On subsequent visits: reads localStorage.
 * Renders a small floating toggle in the bottom-left corner.
 */
(function () {
  const STORAGE_KEY = 'automatos-mood';
  const MODES = { BONE: 'bone', PITCH: 'pitch' };

  function getStoredMood() {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === MODES.BONE || v === MODES.PITCH) return v;
    } catch (_) {}
    return null;
  }

  function getQueryMood() {
    try {
      const sp = new URLSearchParams(window.location.search);
      const v = sp.get('mode');
      if (v === MODES.BONE || v === MODES.PITCH) return v;
      if (window.location.hash === '#pitch') return MODES.PITCH;
      if (window.location.hash === '#bone') return MODES.BONE;
    } catch (_) {}
    return null;
  }

  function getInitialMood() {
    const fromQuery = getQueryMood();
    if (fromQuery) return fromQuery;
    const stored = getStoredMood();
    if (stored) return stored;
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return MODES.PITCH;
    }
    return MODES.BONE;
  }

  function applyMood(mood) {
    document.body.setAttribute('data-mood', mood);
    try { localStorage.setItem(STORAGE_KEY, mood); } catch (_) {}
    const btn = document.getElementById('mood-toggle');
    if (btn) {
      btn.setAttribute('data-mood', mood);
      btn.setAttribute('aria-label', mood === MODES.PITCH ? 'Switch to light (bone) mode' : 'Switch to dark (pitch) mode');
      const label = btn.querySelector('.mood-toggle-label');
      if (label) label.textContent = mood === MODES.PITCH ? 'Pitch' : 'Bone';
    }
  }

  function injectStyles() {
    const css = [
      '#mood-toggle {',
      '  position: fixed; left: 16px; bottom: 16px; z-index: 9999;',
      '  display: inline-flex; align-items: center; gap: 8px;',
      '  padding: 8px 14px;',
      '  background: var(--bg-2, #ECE6D9);',
      '  color: var(--fg, #0F1411);',
      '  border: 1px solid var(--rule-strong, #B6AE99);',
      '  border-radius: 999px;',
      '  font: 500 11px/1 "Geist Mono", ui-monospace, monospace;',
      '  letter-spacing: 0.16em; text-transform: uppercase;',
      '  cursor: pointer;',
      '  transition: background .18s, color .18s, border-color .18s, transform .12s;',
      '  backdrop-filter: blur(6px);',
      '  -webkit-backdrop-filter: blur(6px);',
      '}',
      '#mood-toggle:hover { transform: translateY(-1px); border-color: var(--fg, #0F1411); }',
      '#mood-toggle:active { transform: translateY(0); }',
      '#mood-toggle .mood-dot {',
      '  width: 8px; height: 8px; border-radius: 50%;',
      '  background: var(--fg, #0F1411);',
      '  box-shadow: 0 0 0 1px var(--bg-2, #ECE6D9);',
      '}',
      'body[data-mood="pitch"] #mood-toggle .mood-dot { background: var(--accent, #7FA08A); }',
      '@media print { #mood-toggle { display: none; } }'
    ].join('\n');
    const style = document.createElement('style');
    style.id = 'mood-toggle-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function injectButton() {
    if (document.getElementById('mood-toggle')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'mood-toggle';

    const dot = document.createElement('span');
    dot.className = 'mood-dot';
    dot.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.className = 'mood-toggle-label';
    label.textContent = 'Bone';

    btn.appendChild(dot);
    btn.appendChild(label);

    btn.addEventListener('click', () => {
      const current = document.body.getAttribute('data-mood') || MODES.BONE;
      applyMood(current === MODES.PITCH ? MODES.BONE : MODES.PITCH);
    });

    document.body.appendChild(btn);
  }

  function init() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    injectStyles();
    injectButton();
    applyMood(getInitialMood());
  }

  init();
})();
