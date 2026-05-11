// Auto-generated from Automatos design — Deliverable Icons v1
// 7 types × 3 sizes. Hero = self-contained SVG with baked accent + dark canvas.
// Row + Badge = currentColor (color via parent's text-{x} class).
//
// Usage:
//   <DeliverableIcon type="report" size="row" />        // 24×24, currentColor
//   <DeliverableIcon type="blog_post" size="badge" />   // 16×16, currentColor
//   <DeliverableIcon type="slide" size="hero" />        // 200×200, themed
//
// To recolor a row/badge, wrap in a tailwind class:
//   <span className="text-blue-400"><DeliverableIcon type="report" size="row" /></span>

import * as React from 'react';

export const DELIVERABLE_ACCENTS = {
  report:      { hex: '#60a5fa', tw: 'text-blue-400'    },
  image:       { hex: '#c084fc', tw: 'text-purple-400'  },
  document:    { hex: '#cbd5e1', tw: 'text-slate-300'   },
  code:        { hex: '#34d399', tw: 'text-emerald-400' },
  slide:       { hex: '#fb923c', tw: 'text-orange-400'  },
  spreadsheet: { hex: '#4ade80', tw: 'text-green-400'   },
  blog_post:   { hex: '#22d3ee', tw: 'text-cyan-400'    },
} as const;

export type DeliverableType = keyof typeof DELIVERABLE_ACCENTS;
export type DeliverableSize = 'hero' | 'row' | 'badge';

const ROW: Record<DeliverableType, string> = {
  "report": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n  <line x1=\"4\" y1=\"20\" x2=\"20\" y2=\"20\"/>\n  <rect x=\"6\"  y=\"14\" width=\"3\" height=\"6\"  rx=\"0.5\"/>\n  <rect x=\"11\" y=\"10\" width=\"3\" height=\"10\" rx=\"0.5\"/>\n  <rect x=\"16\" y=\"6\"  width=\"3\" height=\"14\" rx=\"0.5\"/>\n</svg>",
  "image": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n  <rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"2\"/>\n  <circle cx=\"8.5\" cy=\"9.5\" r=\"1.5\"/>\n  <path d=\"M21 16l-5-5-9 9\"/>\n</svg>",
  "document": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n  <path d=\"M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z\"/>\n  <path d=\"M14 3v5h5\"/>\n  <line x1=\"9\"  y1=\"13\" x2=\"15\" y2=\"13\"/>\n  <line x1=\"9\"  y1=\"17\" x2=\"13\" y2=\"17\"/>\n</svg>",
  "code": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n  <path d=\"M8 4c-2 0-3 1-3 3v2c0 1.5-.7 3-2 3 1.3 0 2 1.5 2 3v2c0 2 1 3 3 3\"/>\n  <path d=\"M16 4c2 0 3 1 3 3v2c0 1.5.7 3 2 3-1.3 0-2 1.5-2 3v2c0 2-1 3-3 3\"/>\n</svg>",
  "slide": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n  <rect x=\"3\" y=\"6\" width=\"18\" height=\"13\" rx=\"2\"/>\n  <line x1=\"6\" y1=\"3\" x2=\"18\" y2=\"3\" stroke-opacity=\"0.55\"/>\n  <path d=\"M10 10v5l5-2.5z\" fill=\"currentColor\" stroke=\"none\"/>\n</svg>",
  "spreadsheet": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n  <rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/>\n  <line x1=\"3\"  y1=\"9\"  x2=\"21\" y2=\"9\"/>\n  <line x1=\"3\"  y1=\"15\" x2=\"21\" y2=\"15\"/>\n  <line x1=\"9\"  y1=\"3\"  x2=\"9\"  y2=\"21\"/>\n  <line x1=\"15\" y1=\"3\"  x2=\"15\" y2=\"21\"/>\n</svg>",
  "blog_post": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n  <rect x=\"4\" y=\"3\" width=\"16\" height=\"18\" rx=\"2\"/>\n  <rect x=\"7\" y=\"6\" width=\"10\" height=\"5\" rx=\"0.75\"/>\n  <line x1=\"7\"  y1=\"14\" x2=\"17\" y2=\"14\"/>\n  <line x1=\"7\"  y1=\"17\" x2=\"13\" y2=\"17\"/>\n</svg>"
};
const BADGE: Record<DeliverableType, string> = {
  "report": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n  <line x1=\"2\" y1=\"13.25\" x2=\"14\" y2=\"13.25\"/>\n  <rect x=\"3.5\"  y=\"9\" width=\"2.5\" height=\"4.25\"  rx=\"0.5\"/>\n  <rect x=\"6.75\" y=\"6\" width=\"2.5\" height=\"7.25\"  rx=\"0.5\"/>\n  <rect x=\"10\"   y=\"3\" width=\"2.5\" height=\"10.25\" rx=\"0.5\"/>\n</svg>",
  "image": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n  <rect x=\"2\" y=\"3\" width=\"12\" height=\"10\" rx=\"1.5\"/>\n  <circle cx=\"5.5\" cy=\"6.5\" r=\"1\"/>\n  <path d=\"M14 10.5l-3-3-5.5 5.5\"/>\n</svg>",
  "document": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n  <path d=\"M9.5 2H4.5a1.5 1.5 0 0 0-1.5 1.5v9a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5V5.5z\"/>\n  <path d=\"M9.5 2v3.5h3.5\"/>\n  <line x1=\"5.5\" y1=\"9\"    x2=\"10.5\" y2=\"9\"/>\n  <line x1=\"5.5\" y1=\"11.5\" x2=\"9\"    y2=\"11.5\"/>\n</svg>",
  "code": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n  <path d=\"M5.5 3c-1.25 0-2 .6-2 1.75v1.5c0 .9-.5 1.75-1.25 1.75.75 0 1.25.85 1.25 1.75v1.5C3.5 12.4 4.25 13 5.5 13\"/>\n  <path d=\"M10.5 3c1.25 0 2 .6 2 1.75v1.5c0 .9.5 1.75 1.25 1.75-.75 0-1.25.85-1.25 1.75v1.5C12.5 12.4 11.75 13 10.5 13\"/>\n</svg>",
  "slide": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n  <rect x=\"2\" y=\"4\" width=\"12\" height=\"9\" rx=\"1.5\"/>\n  <line x1=\"4\" y1=\"2\" x2=\"12\" y2=\"2\" stroke-opacity=\"0.55\"/>\n  <path d=\"M6.75 7v3l3-1.5z\" fill=\"currentColor\" stroke=\"none\"/>\n</svg>",
  "spreadsheet": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n  <rect x=\"2\" y=\"2\" width=\"12\" height=\"12\" rx=\"1.5\"/>\n  <line x1=\"2\"  y1=\"6\"  x2=\"14\" y2=\"6\"/>\n  <line x1=\"2\"  y1=\"10\" x2=\"14\" y2=\"10\"/>\n  <line x1=\"6\"  y1=\"2\"  x2=\"6\"  y2=\"14\"/>\n  <line x1=\"10\" y1=\"2\"  x2=\"10\" y2=\"14\"/>\n</svg>",
  "blog_post": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n  <rect x=\"2.5\" y=\"2\" width=\"11\" height=\"12\" rx=\"1.5\"/>\n  <rect x=\"4.5\" y=\"4\" width=\"7\"  height=\"3.5\" rx=\"0.5\"/>\n  <line x1=\"4.5\" y1=\"9.5\"  x2=\"11.5\" y2=\"9.5\"/>\n  <line x1=\"4.5\" y1=\"11.75\" x2=\"9\"   y2=\"11.75\"/>\n</svg>"
};
const HERO: Record<DeliverableType, string> = {
  report: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <radialGradient id="g-report-hero" cx="50%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.18"/>
      <stop offset="55%" stop-color="#60a5fa" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#0a0d14" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="200" height="200" rx="14" fill="#0a0d14"/>
  <rect width="200" height="200" rx="14" fill="url(#g-report-hero)"/>
  <rect x="44" y="40" width="112" height="120" rx="6" fill="none" stroke="#1f2733" stroke-width="1.5"/>
  <line x1="56" y1="132" x2="144" y2="132" stroke="#1f2733" stroke-width="1.25"/>
  <rect x="60" y="108" width="14" height="24" rx="1.5" fill="#60a5fa" fill-opacity="0.22" stroke="#60a5fa" stroke-width="1.5"/>
  <rect x="80" y="92"  width="14" height="40" rx="1.5" fill="#60a5fa" fill-opacity="0.32" stroke="#60a5fa" stroke-width="1.5"/>
  <rect x="100" y="76" width="14" height="56" rx="1.5" fill="#60a5fa" fill-opacity="0.42" stroke="#60a5fa" stroke-width="1.5"/>
  <rect x="120" y="60" width="14" height="72" rx="1.5" fill="#60a5fa" fill-opacity="0.55" stroke="#60a5fa" stroke-width="1.5"/>
  <polyline points="67,100 87,84 107,68 127,52" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="127" cy="52" r="3" fill="#60a5fa"/>
  <line x1="56" y1="52" x2="64" y2="52" stroke="#60a5fa" stroke-width="2" stroke-linecap="round"/></svg>`,
  image: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <radialGradient id="g-image-hero" cx="50%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#c084fc" stop-opacity="0.18"/>
      <stop offset="55%" stop-color="#c084fc" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#0a0d14" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="200" height="200" rx="14" fill="#0a0d14"/>
  <rect width="200" height="200" rx="14" fill="url(#g-image-hero)"/>
  <rect x="40" y="44" width="120" height="112" rx="6" fill="none" stroke="#1f2733" stroke-width="1.5"/>
  <circle cx="124" cy="76" r="9" fill="#c084fc" fill-opacity="0.45" stroke="#c084fc" stroke-width="1.5"/>
  <path d="M48,140 L82,96 L116,140 Z" fill="#c084fc" fill-opacity="0.18" stroke="#c084fc" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M76,150 L108,108 L152,150 Z" fill="#c084fc" fill-opacity="0.32" stroke="#c084fc" stroke-width="1.5" stroke-linejoin="round"/>
  <line x1="48" y1="150" x2="152" y2="150" stroke="#1f2733" stroke-width="1.25"/></svg>`,
  document: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <radialGradient id="g-document-hero" cx="50%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#cbd5e1" stop-opacity="0.18"/>
      <stop offset="55%" stop-color="#cbd5e1" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#0a0d14" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="200" height="200" rx="14" fill="#0a0d14"/>
  <rect width="200" height="200" rx="14" fill="url(#g-document-hero)"/>
  <path d="M58,32 L130,32 L150,52 L150,168 L58,168 Z" fill="none" stroke="#cbd5e1" stroke-width="1.75" stroke-linejoin="round"/>
  <path d="M130,32 L130,52 L150,52" fill="#cbd5e1" fill-opacity="0.14" stroke="#cbd5e1" stroke-width="1.5" stroke-linejoin="round"/>
  <line x1="74" y1="76"  x2="118" y2="76"  stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="74" y1="100" x2="134" y2="100" stroke="#cbd5e1" stroke-opacity="0.55" stroke-width="1.75" stroke-linecap="round"/>
  <line x1="74" y1="118" x2="134" y2="118" stroke="#cbd5e1" stroke-opacity="0.55" stroke-width="1.75" stroke-linecap="round"/>
  <line x1="74" y1="136" x2="110" y2="136" stroke="#cbd5e1" stroke-opacity="0.55" stroke-width="1.75" stroke-linecap="round"/></svg>`,
  code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <radialGradient id="g-code-hero" cx="50%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#34d399" stop-opacity="0.18"/>
      <stop offset="55%" stop-color="#34d399" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#0a0d14" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="200" height="200" rx="14" fill="#0a0d14"/>
  <rect width="200" height="200" rx="14" fill="url(#g-code-hero)"/>
  <path d="M68,44 C58,44 58,72 50,100 C58,128 58,156 68,156" fill="none" stroke="#34d399" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M132,44 C142,44 142,72 150,100 C142,128 142,156 132,156" fill="none" stroke="#34d399" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="78"  y1="84"  x2="118" y2="84"  stroke="#34d399" stroke-opacity="0.7" stroke-width="2" stroke-linecap="round"/>
  <line x1="88"  y1="100" x2="122" y2="100" stroke="#34d399" stroke-width="2" stroke-linecap="round"/>
  <line x1="78"  y1="116" x2="108" y2="116" stroke="#34d399" stroke-opacity="0.7" stroke-width="2" stroke-linecap="round"/>
  <line x1="114" y1="116" x2="114" y2="124" stroke="#34d399" stroke-width="2" stroke-linecap="round"/></svg>`,
  slide: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <radialGradient id="g-slide-hero" cx="50%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#fb923c" stop-opacity="0.18"/>
      <stop offset="55%" stop-color="#fb923c" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#0a0d14" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="200" height="200" rx="14" fill="#0a0d14"/>
  <rect width="200" height="200" rx="14" fill="url(#g-slide-hero)"/>
  <rect x="48" y="56" width="100" height="68" rx="5" fill="#0a0d14" stroke="#fb923c" stroke-opacity="0.35" stroke-width="1.5"/>
  <rect x="56" y="68" width="100" height="68" rx="5" fill="#0a0d14" stroke="#fb923c" stroke-opacity="0.6" stroke-width="1.5"/>
  <rect x="44" y="84" width="112" height="76" rx="6" fill="#fb923c" fill-opacity="0.12" stroke="#fb923c" stroke-width="1.75"/>
  <rect x="56" y="98"  width="44" height="6" rx="2" fill="#fb923c"/>
  <rect x="56" y="112" width="64" height="3" rx="1.5" fill="#fb923c" fill-opacity="0.55"/>
  <rect x="56" y="120" width="52" height="3" rx="1.5" fill="#fb923c" fill-opacity="0.55"/>
  <rect x="56" y="128" width="58" height="3" rx="1.5" fill="#fb923c" fill-opacity="0.55"/>
  <circle cx="134" cy="124" r="13" fill="#fb923c" fill-opacity="0.18" stroke="#fb923c" stroke-width="1.5"/>
  <path d="M130,118 L130,130 L140,124 Z" fill="#fb923c"/></svg>`,
  spreadsheet: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <radialGradient id="g-spreadsheet-hero" cx="50%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#4ade80" stop-opacity="0.18"/>
      <stop offset="55%" stop-color="#4ade80" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#0a0d14" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="200" height="200" rx="14" fill="#0a0d14"/>
  <rect width="200" height="200" rx="14" fill="url(#g-spreadsheet-hero)"/>
  <rect x="52" y="52" width="96" height="96" rx="4" fill="none" stroke="#4ade80" stroke-width="1.75"/>
  <rect x="52" y="52" width="96" height="24" fill="#4ade80" fill-opacity="0.15"/>
  <rect x="100" y="100" width="24" height="24" fill="#4ade80" fill-opacity="0.45"/>
  <line x1="76" y1="52" x2="76" y2="148" stroke="#4ade80" stroke-opacity="0.45" stroke-width="1.25"/>
  <line x1="100" y1="52" x2="100" y2="148" stroke="#4ade80" stroke-opacity="0.45" stroke-width="1.25"/>
  <line x1="124" y1="52" x2="124" y2="148" stroke="#4ade80" stroke-opacity="0.45" stroke-width="1.25"/>
  <line x1="52" y1="76" x2="148" y2="76" stroke="#4ade80" stroke-opacity="0.45" stroke-width="1.25"/>
  <line x1="52" y1="100" x2="148" y2="100" stroke="#4ade80" stroke-opacity="0.45" stroke-width="1.25"/>
  <line x1="52" y1="124" x2="148" y2="124" stroke="#4ade80" stroke-opacity="0.45" stroke-width="1.25"/>
  <circle cx="64" cy="64" r="2" fill="#4ade80"/>
  <circle cx="88" cy="64" r="2" fill="#4ade80"/>
  <circle cx="112" cy="64" r="2" fill="#4ade80"/>
  <circle cx="136" cy="64" r="2" fill="#4ade80"/></svg>`,
  blog_post: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <radialGradient id="g-blog-post-hero" cx="50%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.18"/>
      <stop offset="55%" stop-color="#22d3ee" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#0a0d14" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="200" height="200" rx="14" fill="#0a0d14"/>
  <rect width="200" height="200" rx="14" fill="url(#g-blog-post-hero)"/>
  <rect x="44" y="36" width="112" height="128" rx="6" fill="none" stroke="#22d3ee" stroke-width="1.75"/>
  <rect x="56" y="48" width="88" height="40" rx="3" fill="#22d3ee" fill-opacity="0.18" stroke="#22d3ee" stroke-opacity="0.7" stroke-width="1.25"/>
  <circle cx="74" cy="64" r="4" fill="#22d3ee"/>
  <path d="M60,86 L82,72 L102,84 L122,68 L140,86" fill="none" stroke="#22d3ee" stroke-width="1.5" stroke-linejoin="round"/>
  <rect x="56" y="100" width="60" height="6" rx="2" fill="#22d3ee"/>
  <line x1="56" y1="120" x2="144" y2="120" stroke="#22d3ee" stroke-opacity="0.55" stroke-width="1.75" stroke-linecap="round"/>
  <line x1="56" y1="134" x2="144" y2="134" stroke="#22d3ee" stroke-opacity="0.55" stroke-width="1.75" stroke-linecap="round"/>
  <line x1="56" y1="148" x2="116" y2="148" stroke="#22d3ee" stroke-opacity="0.55" stroke-width="1.75" stroke-linecap="round"/></svg>`
};

export function DeliverableIcon({
  type,
  size,
  className,
}: {
  type: DeliverableType;
  size: DeliverableSize;
  className?: string;
}) {
  const map = size === 'hero' ? HERO : size === 'row' ? ROW : BADGE;
  const markup = map[type];
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
