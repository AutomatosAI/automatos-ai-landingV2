/**
 * Automatos v2 — chat widget loader.
 *
 * Loads the Automatos SDK once globally, then mounts the chat bubble
 * bottom-right with theme overrides matching the v2 waitlist popup
 * (bone-paper sage + pitch-night gold).
 *
 * Reacts to body[data-mood] flips by destroying and re-mounting with
 * the new palette.
 */
(function () {
  if (window.__automatosChatLoader) return;
  window.__automatosChatLoader = true;

  const SDK_URL = 'https://widgets.automatos.app/v0/widget.global.js';

  function getConfig() {
    return window.AUTOMATOS_CONFIG || {};
  }

  function ensureSDK() {
    return new Promise((resolve, reject) => {
      if (window.AutomatosWidget) { resolve(); return; }
      // Re-use existing tag if present
      if (document.querySelector(`script[src="${SDK_URL}"]`)) {
        const poll = setInterval(() => {
          if (window.AutomatosWidget) { clearInterval(poll); resolve(); }
        }, 80);
        setTimeout(() => { clearInterval(poll); reject(new Error('SDK timeout')); }, 12000);
        return;
      }
      const s = document.createElement('script');
      s.src = SDK_URL;
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.onload = () => {
        const poll = setInterval(() => {
          if (window.AutomatosWidget) { clearInterval(poll); resolve(); }
        }, 60);
        setTimeout(() => { clearInterval(poll); reject(new Error('SDK init timeout')); }, 8000);
      };
      s.onerror = () => reject(new Error('SDK load failed'));
      document.head.appendChild(s);
    });
  }

  // Theme palettes matching the waitlist popup + v2 mood tokens
  function paletteFor(mood) {
    if (mood === 'pitch') {
      return {
        '--aw-primary':           '#C7B27A', // warm gold accent
        '--aw-primary-hover':     '#B89F65',
        '--aw-bg':                '#0E1311', // pitch page bg
        '--aw-bg-secondary':      '#161C19', // pitch card bg
        '--aw-text':              '#EFE9DD',
        '--aw-text-secondary':    '#8A857C',
        '--aw-border':            '#3A4138',
      };
    }
    // bone (default)
    return {
      '--aw-primary':           '#5B7C68', // sage accent
      '--aw-primary-hover':     '#476554',
      '--aw-bg':                '#F2EDE4', // bone paper bg
      '--aw-bg-secondary':      '#ECE6DA', // bone-2
      '--aw-text':               '#0F1411',
      '--aw-text-secondary':    '#6E6960',
      '--aw-border':            '#B6AE99',
    };
  }

  let instance = null;
  let currentMood = null;

  function mount() {
    const cfg = getConfig();
    if (!cfg.publicKey) {
      console.warn('[Automatos chat] AUTOMATOS_CONFIG.publicKey missing — chat disabled.');
      return;
    }
    if (!window.AutomatosWidget) return;
    const mood = (document.body && document.body.getAttribute('data-mood')) === 'pitch' ? 'pitch' : 'bone';
    if (instance && currentMood === mood) return;
    if (instance && typeof instance.destroy === 'function') {
      try { instance.destroy(); } catch (_) {}
      instance = null;
    }
    currentMood = mood;
    instance = window.AutomatosWidget.init({
      apiKey: cfg.publicKey,
      widget: 'chat',
      position: 'bottom-right',
      theme: mood === 'pitch' ? 'dark' : 'light',
      title: 'Auto',
      greeting: 'Hi — I\'m Auto. Ask about Automatos, the agents, or the platform.',
      ...(cfg.chatAgentId ? { agentId: cfg.chatAgentId } : {}),
      themeOverrides: paletteFor(mood),
    });
  }

  function watchMood() {
    if (!document.body) return;
    const obs = new MutationObserver(() => mount());
    obs.observe(document.body, { attributes: true, attributeFilter: ['data-mood'] });
  }

  function init() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    ensureSDK().then(mount).catch(err => {
      console.warn('[Automatos chat] SDK unavailable:', err && err.message ? err.message : err);
    });
    watchMood();
  }

  init();
})();
