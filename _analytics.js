/**
 * Automatos v2 — Google Analytics 4 loader.
 *
 * Ported from v1 (G-LN0Z3GSDKB). Centralised so the GA ID lives in
 * exactly one place. Loaded as a defer script from every page that
 * should be tracked. Initialises window.dataLayer + gtag(), pushes
 * the initial config event, and then async-loads the gtag.js library
 * which picks up the queue.
 */
(function () {
  if (window.__automatosAnalytics) return;
  window.__automatosAnalytics = true;

  const GA_ID = 'G-LN0Z3GSDKB';

  // dataLayer + gtag must exist before any tracking call. We expose
  // gtag globally so other scripts (e.g. _waitlist) can fire custom events.
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', GA_ID);

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
})();
