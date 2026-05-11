// ═══════════════════════════════════════════════════════════════════
// Automatos Social Render — shared helpers
// Used by every render/<template>.html standalone page.
// ═══════════════════════════════════════════════════════════════════

// Canvas sizes — keep keys stable; agents/playbooks reference these
window.AUTOMATOS_SIZES = {
  ig_post:  { w: 1080, h: 1350, label: 'Instagram 4:5' },
  ig_story: { w: 1080, h: 1920, label: 'Instagram Story / Reel 9:16' },
  linkedin: { w: 1200, h: 628,  label: 'LinkedIn / Facebook 1.91:1' },
  twitter:  { w: 1600, h: 900,  label: 'Twitter/X / YouTube 16:9' },
};

// Parse URL query string — supports ?key=value and JSON-encoded arrays/objects
window.parseParams = () => {
  const u = new URL(window.location.href);
  const out = {};
  for (const [k, v] of u.searchParams.entries()) {
    // try JSON first (for arrays/objects); fall back to string
    if (v.startsWith('[') || v.startsWith('{')) {
      try { out[k] = JSON.parse(v); continue; } catch (e) {}
    }
    out[k] = v;
  }
  return out;
};

// Set body to exact pixel dimensions for screenshot capture
window.setCanvasSize = (size) => {
  const dims = window.AUTOMATOS_SIZES[size] || window.AUTOMATOS_SIZES.ig_post;
  document.documentElement.style.cssText =
    `margin:0;padding:0;width:${dims.w}px;height:${dims.h}px;overflow:hidden;background:#f1e9dd;`;
  document.body.style.cssText =
    `margin:0;padding:0;width:${dims.w}px;height:${dims.h}px;overflow:hidden;font-family:Inter,system-ui,sans-serif;`;
  return dims;
};

// Signal renderer that page is ready to screenshot
// Headless renderers (Puppeteer/Playwright) wait for window.__renderReady === true
window.signalRenderReady = () => {
  // wait for fonts before signalling
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        window.__renderReady = true;
        document.body.setAttribute('data-render-ready', 'true');
      }));
    });
  } else {
    setTimeout(() => { window.__renderReady = true; document.body.setAttribute('data-render-ready', 'true'); }, 600);
  }
};

// Helpers for split-accent text — turns "WHAT IS|AN AGENT?|brick" into
// rendered headline with the second part in brick orange
window.parseHeadline = (raw) => {
  if (!raw) return [];
  // Format: "line1|line2|line3" with optional "@brick" suffix per line
  // e.g. "WHAT IS|AN AGENT?@brick"
  return raw.split('|').map((part) => {
    const m = part.match(/^(.*?)(@brick)?$/);
    return { text: m[1].trim(), color: m[2] ? 'brick' : 'ink' };
  });
};
