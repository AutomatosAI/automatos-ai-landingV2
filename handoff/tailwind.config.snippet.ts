/* ===========================================================================
   BUDSTACKS ADMIN — tailwind.config.snippet.ts
   Merge this `extend` block into your existing tailwind.config.ts.
   Do NOT replace the whole config — only add the bs-* keys.
   =========================================================================== */

import type { Config } from 'tailwindcss';

const budstacksTheme: NonNullable<Config['theme']>['extend'] = {
  colors: {
    // Surface
    'bs-bg':         '#07090A',
    'bs-bg-smoke':   '#050a07',
    'bs-card':       '#151A1C',
    'bs-input':      '#0F1517',
    'bs-hover':      '#1A2123',
    'bs-step-200':   '#222A2C',
    'bs-step-300':   '#2F3A3D',
    'bs-border':     '#222A2C',
    'bs-border-100': '#1c2326',

    // Text
    'bs-fg':         '#F5F6F4',
    'bs-fg-2':       '#F2F4F2',
    'bs-fg-body':    '#C6CCC8',
    'bs-fg-body-2':  '#EAEEEA',
    'bs-fg-muted':   '#8A938F',

    // Brand
    'bs-green':      '#52D97A',
    'bs-green-deep': '#2FB560',
    'bs-green-soft': '#8CF0A4',

    // Gold
    'bs-gold':       '#D9BC82',
    'bs-gold-soft':  '#E8D19E',
    'bs-gold-cream': '#fcfcbc',

    // Semantic
    'bs-danger':     '#F87171',
    'bs-warn':       '#F5C26B',
    'bs-info':       '#7DB7FF',
  },

  fontFamily: {
    display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
    sans:    ['Inter', 'system-ui', 'sans-serif'],
    mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
  },

  fontSize: {
    'display-xl':  ['48px',  { lineHeight: '1.05', letterSpacing: '-0.01em' }],
    'display-lg':  ['32px',  { lineHeight: '1.10' }],
    'display-md':  ['22px',  { lineHeight: '1.20' }],
    'display-num': ['36px',  { lineHeight: '1',    letterSpacing: '-0.01em' }],
    'mono-eyebrow':['11px',  { lineHeight: '1.4',  letterSpacing: '0.20em' }],
    'mono-chip':   ['11px',  { lineHeight: '1.4',  letterSpacing: '0.10em' }],
    'mono-cell':   ['12.5px',{ lineHeight: '1.4' }],
  },

  borderRadius: {
    'bs-sm':   '6px',
    'bs-md':   '10px',
    'bs-lg':   '16px',
    'bs-pill': '9999px',
  },

  boxShadow: {
    'bs-card':       '0 1px 0 rgba(255,255,255,0.04) inset, 0 20px 60px -30px rgba(0,0,0,0.7)',
    'bs-card-hover': '0 1px 0 rgba(255,255,255,0.06) inset, 0 0 0 1px rgba(82,217,122,0.18), 0 24px 70px -28px rgba(0,0,0,0.8)',
    'bs-glow':       '0 0 0 1px rgba(82,217,122,0.30), 0 10px 30px -10px rgba(82,217,122,0.40)',
    'bs-glow-hover': '0 0 0 1px rgba(82,217,122,0.50), 0 14px 40px -8px rgba(82,217,122,0.55)',
  },

  backgroundImage: {
    'bs-green-tint': 'linear-gradient(rgba(82,217,122,0.06), rgba(82,217,122,0.06))',
    'bs-gold-tint':  'linear-gradient(rgba(231,219,184,0.14), rgba(231,219,184,0.14))',
  },
};

export default budstacksTheme;

/* === Usage ===
import budstacksTheme from './handoff/tailwind.config.snippet';

const config: Config = {
  // ... your existing config ...
  theme: {
    extend: {
      ...budstacksTheme,
      // ... any of your other extends ...
    },
  },
};
*/
