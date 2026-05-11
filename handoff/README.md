# Budstacks Admin Design System — Handoff

**For:** Claude Code (or any engineer rolling out the design system)
**Scope:** All three admin surfaces — **Super Admin**, **Tenant Admin**, **Client Admin**
**Source of truth:** `Budstacks Admin Design System.html` (open it — it's the visual spec)

---

## Why this exists

The Budstacks marketing site and tenant pages have a strong, distinctive visual identity (dark surfaces, serif display headlines, mono detail type, emerald-and-cream-gold palette). When the new theme was rolled out across the admin pages, the implementation drifted: cream backgrounds appeared on some pages, three different button styles compete for "primary" status, status badges use four different visual systems, and stat cards switched between serif and sans treatments.

This bundle defines **one** system, demonstrates it visually, and gives you copy-pasteable Tailwind tokens and component classes. **Every admin page in every tier must conform to it.**

---

## What's in this bundle

| File | What it is | What to do with it |
|---|---|---|
| `Budstacks Admin Design System.html` | The full visual spec — open in a browser. Tokens, type, components, page templates, do/don't examples, anatomy callouts. | **Read first, end-to-end.** Refer back to it for any judgment call. |
| `theme.css` | Standalone CSS variables + `.bs-*` component styles. Drop-in for non-Tailwind contexts. | If a page isn't using Tailwind, link this file. |
| `tailwind.config.snippet.ts` | The `theme.extend` block to merge into your existing `tailwind.config.ts`. | Merge — don't replace your existing config. |
| `globals.layer.css` | The `@layer components` block to paste into the project's `globals.css`. | Paste below your existing `@layer base` and `@tailwind` directives. |
| `MIGRATION_CHECKLIST.md` | Per-page migration instructions for Super / Tenant / Client admin. | Work through it page-by-page. |

---

## The three admin tiers

The same design system applies to all three. They share **all** tokens, type, components, chrome and page templates. The only differences are:

| Aspect | Super Admin | Tenant Admin | Client Admin |
|---|---|---|---|
| **Audience** | Budstacks platform staff | Operator/store owners (Healing Buds, etc) | End-customer / patient self-service |
| **Sidebar accent dot** | `bs-gold` (cream-gold) | `bs-green` (emerald) | `bs-info` (soft blue) |
| **Eyebrow tag colour** | gold (default) | gold (default) | gold (default) — keep consistent |
| **Page headers** | Always centered serif (settings) or compact (data tables) — **same as tenant** | Same as super | Same — but lean toward compact left-aligned for self-service flows that need to feel quick |
| **Primary CTA** | `bs-btn-green` | `bs-btn-green` | `bs-btn-green` |
| **Surfaces, cards, type, chips** | Identical | Identical | Identical |

**Rule:** the differentiator between tiers is the *content* (what data, what actions are exposed) and a single accent colour on the sidebar nav indicator. Everything else is shared so a Budstacks staff member moving between Super and Tenant feels they're in the same product.

> Do **not** introduce a different palette per tier, different typography per tier, or different card styles per tier. That's the trap that started this project.

---

## Roll-out order (recommended)

1. **Tokens & global styles first.** Merge `tailwind.config.snippet.ts` and `globals.layer.css` into the codebase. Do not migrate any pages until this is done and verified — every component class below assumes those tokens exist.
2. **Page chrome second.** App shell, sidebar, top bar, page background. Fix `bg-bs-bg` everywhere. Drop the cream Analytics background.
3. **Page header pattern third.** Apply the eyebrow + Cormorant title + subtitle to every page that lacks it (Customers is the most obvious gap). Use **Template A** (centered serif) for settings/dashboards, **Template C** (compact left) for pure data-table pages — both are documented in the HTML spec under `§ 05 Templates`.
4. **Components fourth.** Buttons → chips → stat cards → cards → tables → inputs. Roughly in that order — buttons and chips are the most-visible offenders.
5. **Audit last.** Grep the codebase for any `#` hex literal not in the token list. Every one is a bug.

---

## Hard rules (non-negotiable)

These exist because they're the most-violated patterns today:

1. **Background is always `bg-bs-bg`** (`#07090A`). The cream/parchment background on the Analytics page is **retired**. The smoky variant `bg-bs-bg-smoke` is reserved for hero sections and modal scrims.
2. **One primary action per view.** `bs-btn-green` is *the* primary. The teal-cyan gradient "Export" button must become `bs-btn-ghost`. If two buttons feel like they should both be primary, one of them isn't.
3. **One chip system.** Every status / category / tag uses `.bs-chip` + a colour role (`green` / `warn` / `info` / `danger` / `gold` / `muted`). No solid-fill pills, no outlined pills with a different shape, no cream-fill product strain pills. Same shape, only the role colour changes.
4. **Cormorant Garamond for all titles.** Page titles, card titles, big metric numbers. Never Inter for these. Inter is for body, buttons, labels, table cells.
5. **JetBrains Mono is mandatory for:** eyebrows, chip labels, IDs, IP addresses, timestamps, JSON snippets, exact numbers in table cells, currency in stat cards (the *value* is Cormorant; the eyebrow label is Mono).
6. **Big metric numbers are `bs-gold-cream` (`#fcfcbc`).** Not white, not green, not Inter-bold. Cormorant 36px in cream-gold. This is the "feel" of a Budstacks dashboard.
7. **Card hover is a soft green ring**, not a colour shift. `box-shadow: bs-card-hover` adds `0 0 0 1px rgba(82,217,122,0.18)` — never change the border colour or the fill.
8. **Tables wrap in a card.** Wrapper = `.bs-card` with `overflow-hidden`. Toolbar (Cormorant title + count + search + filters + export) sits inside, before the `<table>`. Numeric / ID / IP / timestamp cells use the `.mono` class.
9. **No new colours.** If a need arises that isn't covered (e.g. a brand-new semantic state), open an issue — don't pick a hex.
10. **No emoji in admin UI.** Use the icon set already in the project. Eyebrows can use a neutral glyph (`◆`) but no emoji.

---

## Cheat sheet — most-used classes

```html
<!-- Page header (centered, settings/dashboard) -->
<div class="bs-page-header-centered">
  <span class="bs-eyebrow">◆ Privacy</span>
  <h1 class="bs-page-title">Cookie & Privacy Settings</h1>
  <p class="bs-page-subtitle">Configure how cookies are managed on your storefront.</p>
</div>

<!-- Page header (compact, data-table pages) -->
<div class="bs-page-header-compact">
  <div>
    <span class="bs-eyebrow">◆ Security</span>
    <h1 class="bs-page-title">Audit Logs</h1>
    <p class="bs-page-subtitle">Track all actions and changes.</p>
  </div>
  <div class="flex gap-2"> <!-- toolbar --> </div>
</div>

<!-- Card -->
<section class="bs-card bs-card-pad">
  <header class="bs-card-head">
    <div class="bs-card-icon"><Icon /></div>
    <div>
      <h3 class="bs-card-title">Domain Configuration</h3>
      <p class="bs-card-desc">Manage your store's domain settings</p>
    </div>
  </header>
  ...
</section>

<!-- Stat card -->
<div class="bs-stat">
  <div class="bs-stat-row">
    <span class="bs-stat-label">Total Revenue</span>
    <span class="bs-stat-icon"><Icon /></span>
  </div>
  <div class="bs-stat-value">€15,859.23</div>
  <div class="bs-stat-delta up">▲ +12.5% vs prev</div>
</div>

<!-- Buttons -->
<button class="bs-btn bs-btn-green">Sync from Dr Green</button>
<button class="bs-btn bs-btn-ghost">Export records</button>
<button class="bs-btn bs-btn-text">View →</button>
<button class="bs-btn bs-btn-danger">Delete tenant</button>

<!-- Chips -->
<span class="bs-chip bs-chip-green"><span class="dot"></span> In Stock</span>
<span class="bs-chip bs-chip-warn"><span class="dot"></span> Pending</span>
<span class="bs-chip bs-chip-info"><span class="dot"></span> Processing</span>
<span class="bs-chip bs-chip-danger"><span class="dot"></span> Failed</span>
<span class="bs-chip bs-chip-gold">Hybrid</span>
<span class="bs-chip bs-chip-muted">N/A</span>

<!-- Inputs -->
<label class="bs-label">Custom Banner Message</label>
<input class="bs-input" placeholder="…" />
<p class="bs-help">Leave empty for default.</p>

<!-- Table -->
<div class="bs-table-wrap">
  <div class="bs-table-toolbar">…</div>
  <table class="bs-table">
    <thead>…</thead>
    <tbody>
      <tr>
        <td class="strong">Caribbean Breeze</td>
        <td class="num">23%</td>
        <td><span class="bs-chip bs-chip-green"><span class="dot"></span> In Stock</span></td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## Decision log (so you know why)

- **All-dark, no cream backgrounds** — chosen because cohesion across tiers matters more than per-page novelty. The cream Analytics page broke the "one product" feeling.
- **Emerald is the only primary CTA colour** — the teal-cyan gradient created a second primary that competed for attention.
- **Stat cards use mono eyebrow + serif cream-gold metric** — this was already the canonical treatment on Audit/Orders; the Analytics page deviated. Standardising on the more distinctive treatment.
- **Two header rhythms, not one** — heavy data-table pages need vertical room; forcing the centered serif pattern on Audit Logs would crowd the table. The compact left-aligned variant is documented and equally legitimate.
- **Cormorant Garamond as the display face** — close visual match to what's currently rendering. If the project is using a different licensed serif (e.g. Cormorant SC, EB Garamond), update `--bs-font-display` in `theme.css` and the `fontFamily.display` array in the Tailwind config — keep everything else the same.

---

## When in doubt

1. **Open `Budstacks Admin Design System.html`** — find the closest analogous component.
2. **Check § 06 Do/Don't** — the violation you're considering is probably listed there.
3. **Default to the more restrained option.** Premium and operational beats playful and decorative.
4. **Don't invent.** If a needed pattern truly isn't here, surface it as a question rather than guessing.
