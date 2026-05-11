/**
 * Automatos v2 — waitlist popup (shared).
 *
 * Drop-in: inject `<script src="_waitlist.js" defer></script>` on any page.
 * Any element with [data-waitlist] becomes a trigger.
 *
 * Theme-aware via the site's existing --bg / --fg / --accent CSS variables.
 * Persistence: berth counter in localStorage('automatos.berth').
 */
(function () {
  if (window.__automatosWaitlist) return;
  window.__automatosWaitlist = true;

  const BERTH_KEY = 'automatos.berth';
  const BASELINE  = 246;

  function injectStyles() {
    if (document.getElementById('wl-styles')) return;
    const css = [
      '.wl-backdrop {',
      '  position: fixed; inset: 0; z-index: 9999;',
      '  background: color-mix(in srgb, #000 62%, transparent);',
      '  backdrop-filter: blur(2px);',
      '  display: none; align-items: center; justify-content: center;',
      '  padding: 24px; opacity: 0; transition: opacity .22s ease;',
      '}',
      '.wl-backdrop[data-open="true"] { display: flex; opacity: 1; }',
      '.wl-card {',
      '  position: relative; width: 100%; max-width: 520px;',
      '  background: radial-gradient(ellipse 90% 70% at 50% 30%, var(--bg) 0%, var(--bg-2) 100%);',
      '  color: var(--fg);',
      '  border: 1px solid var(--rule-strong);',
      '  box-shadow: 0 22px 60px -10px rgba(0,0,0,.45), 0 2px 0 rgba(0,0,0,.06) inset;',
      '  padding: 28px 32px 24px;',
      '  transform: translateY(8px) scale(.985);',
      '  transition: transform .26s cubic-bezier(.2,.7,.2,1);',
      '  overflow: hidden;',
      '}',
      '.wl-backdrop[data-open="true"] .wl-card { transform: translateY(0) scale(1); }',
      '.wl-card::before {',
      '  content: ""; position: absolute; inset: 0; pointer-events: none;',
      '  background-image: repeating-linear-gradient(0deg,',
      '    color-mix(in srgb, var(--fg) 2%, transparent) 0 1px,',
      '    transparent 1px 3px);',
      '  z-index: 0;',
      '}',
      '.wl-card > * { position: relative; z-index: 1; }',
      '.wl-meta {',
      '  display: flex; justify-content: space-between; align-items: baseline;',
      '  font-family: var(--mono); font-size: 9.5px; letter-spacing: .18em;',
      '  text-transform: uppercase; color: var(--muted);',
      '  padding-bottom: 10px; border-bottom: 1px solid var(--rule-c);',
      '}',
      '.wl-close {',
      '  width: 22px; height: 22px; display: grid; place-items: center;',
      '  font-family: var(--mono); font-size: 14px; line-height: 1;',
      '  color: var(--fg-2); cursor: pointer;',
      '  border: 1px solid var(--rule-c); background: transparent;',
      '  transition: background .15s, color .15s;',
      '}',
      '.wl-close:hover { background: var(--fg); color: var(--bg); border-color: var(--fg); }',
      '.wl-title {',
      '  font-family: var(--serif); font-style: italic;',
      '  font-size: 38px; line-height: 1; letter-spacing: -.015em;',
      '  margin: 14px 0 6px;',
      '}',
      '.wl-lede {',
      '  font-family: var(--serif); font-size: 16px; line-height: 1.45;',
      '  color: var(--fg-2); margin: 0 0 18px; text-wrap: pretty;',
      '}',
      '.wl-lede em { font-style: italic; color: var(--fg); }',
      '.wl-form { display: grid; gap: 12px; }',
      '.wl-row { display: grid; gap: 4px; }',
      '.wl-row > label {',
      '  display: flex; justify-content: space-between; align-items: baseline;',
      '  font-family: var(--mono); font-size: 9.5px; letter-spacing: .16em;',
      '  text-transform: uppercase; color: var(--muted);',
      '}',
      '.wl-row > label .opt { color: color-mix(in srgb, var(--muted) 70%, transparent); }',
      '.wl-row input, .wl-row select, .wl-row textarea {',
      '  width: 100%; font: 400 14px/1.4 var(--sans); color: var(--fg);',
      '  background: transparent; border: 0;',
      '  border-bottom: 1px solid var(--rule-strong);',
      '  padding: 6px 2px 8px; outline: none;',
      '  transition: border-color .15s;',
      '}',
      '.wl-row textarea { resize: none; min-height: 52px; }',
      '.wl-row input::placeholder, .wl-row textarea::placeholder {',
      '  color: color-mix(in srgb, var(--muted) 80%, transparent); font-style: italic;',
      '}',
      '.wl-row input:focus, .wl-row select:focus, .wl-row textarea:focus {',
      '  border-bottom-color: var(--accent);',
      '}',
      '.wl-row select {',
      '  appearance: none; -webkit-appearance: none;',
      '  background:',
      '    linear-gradient(45deg, transparent 50%, var(--muted) 50%) calc(100% - 12px) 18px / 5px 5px no-repeat,',
      '    linear-gradient(135deg, var(--muted) 50%, transparent 50%) calc(100% - 7px) 18px / 5px 5px no-repeat;',
      '  padding-right: 22px;',
      '}',
      '.wl-row-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }',
      '.wl-submit-row { margin-top: 10px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }',
      '.wl-submit {',
      '  font-family: var(--sans); font-size: 13px; letter-spacing: .02em;',
      '  padding: 11px 18px; border: 1px solid var(--fg); background: var(--fg);',
      '  color: var(--bg); cursor: pointer;',
      '  display: inline-flex; align-items: center; gap: 8px;',
      '  transition: opacity .15s;',
      '}',
      '.wl-submit:hover { opacity: .88; }',
      '.wl-submit .arrow { font-family: var(--mono); }',
      '.wl-note {',
      '  font-family: var(--mono); font-size: 9px; letter-spacing: .16em;',
      '  text-transform: uppercase; color: var(--muted);',
      '  text-align: right; line-height: 1.4;',
      '}',
      '.wl-foot {',
      '  margin-top: 22px; padding-top: 10px; border-top: 1px solid var(--rule-c);',
      '  display: flex; justify-content: space-between;',
      '  font-family: var(--mono); font-size: 9px; letter-spacing: .18em;',
      '  text-transform: uppercase; color: var(--muted);',
      '}',
      '.wl-corners i, .wl-corners b {',
      '  position: absolute; width: 14px; height: 14px;',
      '  border: 1px solid var(--rule-strong); z-index: 2;',
      '}',
      '.wl-corners i { top: -1px; left: -1px; border-right: 0; border-bottom: 0; }',
      '.wl-corners b { bottom: -1px; right: -1px; border-left: 0; border-top: 0; }',
      '.wl-card[data-state="ok"] .wl-form, .wl-card[data-state="ok"] .wl-lede { display: none; }',
      '.wl-success { display: none; }',
      '.wl-card[data-state="ok"] .wl-success { display: grid; gap: 14px; padding: 4px 0 0; }',
      '.wl-success-line {',
      '  font-family: var(--serif); font-size: 17px; line-height: 1.5;',
      '  color: var(--fg-2); text-wrap: pretty;',
      '}',
      '.wl-success-line b { color: var(--fg); font-weight: 500; }',
      '.wl-stamp {',
      '  position: absolute; right: 26px; top: 78px;',
      '  width: 110px; height: 110px;',
      '  border: 1.6px solid var(--accent); color: var(--accent);',
      '  border-radius: 50%; display: grid; place-items: center;',
      '  font-family: var(--mono); font-size: 10px; letter-spacing: .22em;',
      '  text-transform: uppercase; text-align: center; line-height: 1.35;',
      '  transform: rotate(-12deg) scale(.4); opacity: 0;',
      '  transition: opacity .35s ease .15s, transform .55s cubic-bezier(.2,.8,.2,1.2) .1s;',
      '  pointer-events: none;',
      '}',
      '.wl-stamp b { font-weight: 500; display: block; margin-top: 4px; font-size: 14px; letter-spacing: .14em; }',
      '.wl-card[data-state="ok"] .wl-stamp { opacity: .72; transform: rotate(-12deg) scale(1); }'
    ].join('\n');
    const style = document.createElement('style');
    style.id = 'wl-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'text') node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    }
    if (children) children.forEach(c => node.appendChild(c));
    return node;
  }

  function buildModal() {
    if (document.getElementById('wlBackdrop')) return;

    // Select options
    const rolePicker = el('select', { id: 'wl-role', name: 'role' }, [
      el('option', { value: '', text: 'Choose one…' }),
      el('option', { text: 'Founder / Operator' }),
      el('option', { text: 'Engineer' }),
      el('option', { text: 'Designer' }),
      el('option', { text: 'Researcher' }),
      el('option', { text: 'Agent builder' }),
      el('option', { text: 'Other' })
    ]);
    const crewPicker = el('select', { id: 'wl-crew', name: 'crew' }, [
      el('option', { value: '', text: '—' }),
      el('option', { text: 'Just me' }),
      el('option', { text: '2–10' }),
      el('option', { text: '11–50' }),
      el('option', { text: '51–250' }),
      el('option', { text: '250+' })
    ]);

    const closeBtn = el('button', { class: 'wl-close', id: 'wlClose', 'aria-label': 'Close', text: '×' });
    const meta = el('div', { class: 'wl-meta' }, [
      el('span', { text: 'Form M-04 · Berth reservation' }),
      closeBtn
    ]);

    const title = el('h2', { class: 'wl-title', id: 'wlTitle', text: 'Sign the watch bill.' });

    const lede = el('p', { class: 'wl-lede' });
    lede.appendChild(document.createTextNode('We’re mustering the first crew. Leave your mark and we’ll signal you when a berth opens — usually '));
    lede.appendChild(el('em', { text: 'under two weeks' }));
    lede.appendChild(document.createTextNode('.'));

    const labelOpt = (text) => {
      const s = document.createElement('span');
      s.className = 'opt';
      s.textContent = text;
      return s;
    };

    const nameLabel = el('label', { for: 'wl-name', text: 'No. 01 · Full name' });
    const nameInput = el('input', { id: 'wl-name', name: 'name', required: '', autocomplete: 'name', placeholder: 'e.g. K. Halford' });
    const nameRow = el('div', { class: 'wl-row' }, [nameLabel, nameInput]);

    const emailLabel = el('label', { for: 'wl-email' });
    emailLabel.appendChild(document.createTextNode('No. 02 · Email '));
    emailLabel.appendChild(labelOpt('· for the signal flare'));
    const emailInput = el('input', { id: 'wl-email', name: 'email', type: 'email', required: '', autocomplete: 'email', placeholder: 'you@vessel.co' });
    const emailRow = el('div', { class: 'wl-row' }, [emailLabel, emailInput]);

    const roleRow = el('div', { class: 'wl-row' }, [
      el('label', { for: 'wl-role', text: 'No. 03 · Rating' }),
      rolePicker
    ]);
    const crewRow = el('div', { class: 'wl-row' }, [
      el('label', { for: 'wl-crew', text: 'No. 04 · Crew size' }),
      crewPicker
    ]);
    const grid = el('div', { class: 'wl-row-grid' }, [roleRow, crewRow]);

    const shipLabel = el('label', { for: 'wl-ship' });
    shipLabel.appendChild(document.createTextNode('No. 05 · What you’d ship first '));
    shipLabel.appendChild(labelOpt('· optional'));
    const shipTextarea = el('textarea', { id: 'wl-ship', name: 'ship', rows: '2', placeholder: 'A crew that drafts and reviews our weekly product memo…' });
    const shipRow = el('div', { class: 'wl-row' }, [shipLabel, shipTextarea]);

    const submitBtn = el('button', { type: 'submit', class: 'wl-submit' });
    submitBtn.appendChild(document.createTextNode('Make your mark '));
    submitBtn.appendChild(el('span', { class: 'arrow', text: '→' }));

    const berthPreview = el('span', { id: 'wlBerthPreview', text: '#0247' });
    const note = el('div', { class: 'wl-note' });
    note.appendChild(document.createTextNode('Berth '));
    note.appendChild(berthPreview);
    note.appendChild(document.createTextNode(' awaiting'));
    note.appendChild(el('br'));
    note.appendChild(document.createTextNode('We only write when there’s a ship to board'));

    const submitRow = el('div', { class: 'wl-submit-row' }, [submitBtn, note]);
    const form = el('form', { class: 'wl-form', id: 'wlForm', novalidate: '' }, [nameRow, emailRow, grid, shipRow, submitRow]);

    const successLine1 = el('p', { class: 'wl-success-line' });
    successLine1.appendChild(document.createTextNode('Marked. You’re berth '));
    const berthAssigned = el('b', { id: 'wlBerthAssigned', text: '#0247' });
    successLine1.appendChild(berthAssigned);
    successLine1.appendChild(document.createTextNode(' on the muster — we’ll send the signal flare when a hammock clears.'));

    const successLine2 = el('p', { class: 'wl-success-line', style: 'font-size:14px; color:var(--muted);', text: 'In the meantime: the docs are open, and the source is on GitHub. Build something while you wait.' });

    const success = el('div', { class: 'wl-success', 'aria-live': 'polite' }, [successLine1, successLine2]);

    const stamp = el('div', { class: 'wl-stamp' });
    stamp.appendChild(document.createTextNode('Mustered'));
    stamp.appendChild(el('b', { id: 'wlStampNum', text: '#0247' }));

    const foot = el('div', { class: 'wl-foot' }, [
      el('span', { text: 'Automatos · Vol. 19' }),
      el('span', { id: 'wlFootDate', text: '04 · 26 · 26' })
    ]);

    const corners = el('span', { class: 'wl-corners' }, [el('i'), el('b')]);

    const card = el('div', { class: 'wl-card', id: 'wlCard', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'wlTitle', 'data-state': 'form' },
      [corners, meta, title, lede, form, success, stamp, foot]);
    const backdrop = el('div', { class: 'wl-backdrop', id: 'wlBackdrop', 'aria-hidden': 'true' }, [card]);
    document.body.appendChild(backdrop);
  }

  function nextBerth() {
    const cur = parseInt(localStorage.getItem(BERTH_KEY) || String(BASELINE), 10);
    return cur + 1;
  }
  function formatBerth(n) { return '#' + String(n).padStart(4, '0'); }

  function refreshPreview() {
    const el = document.getElementById('wlBerthPreview');
    if (el) el.textContent = formatBerth(nextBerth());
  }

  function setDate() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    const el = document.getElementById('wlFootDate');
    if (el) el.textContent = mm + ' · ' + dd + ' · ' + yy;
  }

  function openModal() {
    const backdrop = document.getElementById('wlBackdrop');
    const card = document.getElementById('wlCard');
    if (!backdrop || !card) return;
    card.setAttribute('data-state', 'form');
    refreshPreview();
    backdrop.setAttribute('data-open', 'true');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => { const f = document.getElementById('wl-name'); if (f) f.focus(); }, 80);
  }
  function closeModal() {
    const backdrop = document.getElementById('wlBackdrop');
    if (!backdrop) return;
    backdrop.setAttribute('data-open', 'false');
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function wire() {
    document.querySelectorAll('[data-waitlist]').forEach(el => {
      if (el.__wlBound) return;
      el.__wlBound = true;
      el.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
    });

    const closeBtn = document.getElementById('wlClose');
    const backdrop = document.getElementById('wlBackdrop');
    const form = document.getElementById('wlForm');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
    document.addEventListener('keydown', (e) => {
      const b = document.getElementById('wlBackdrop');
      if (e.key === 'Escape' && b && b.getAttribute('data-open') === 'true') closeModal();
    });
    if (form) form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      if (!data.name || !data.email) return;
      const berth = nextBerth();
      localStorage.setItem(BERTH_KEY, String(berth));
      const tag = formatBerth(berth);
      const a = document.getElementById('wlBerthAssigned');
      const s = document.getElementById('wlStampNum');
      if (a) a.textContent = tag;
      if (s) s.textContent = tag;
      const card = document.getElementById('wlCard');
      if (card) card.setAttribute('data-state', 'ok');
      // TODO: POST data to backend
    });
  }

  function checkAutoOpen() {
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('waitlist') === 'open' || window.location.hash === '#waitlist') {
        setTimeout(openModal, 50);
      }
    } catch (_) {}
  }

  function init() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    injectStyles();
    buildModal();
    setDate();
    refreshPreview();
    wire();
    checkAutoOpen();
  }

  init();
})();
