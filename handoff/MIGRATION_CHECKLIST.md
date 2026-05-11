# Migration Checklist — Per-Page

Work through this top-to-bottom. Tick items off as you go. Every page in every tier ends up at the same level of conformance.

## Phase 0 · Foundation (do once, before any page work)

- [ ] Merge `tailwind.config.snippet.ts` into `tailwind.config.ts`. Do **not** delete existing keys; only add the new `bs-*` tokens, fonts, sizes, radii, shadows, and background images.
- [ ] Paste `globals.layer.css` into the project's `globals.css` (below `@tailwind base/components/utilities`).
- [ ] Add the Google Fonts `<link>` for Cormorant Garamond, Inter, JetBrains Mono to the root layout's `<head>`.
- [ ] Set `<body class="bg-bs-bg text-bs-fg-body font-sans antialiased">`.
- [ ] Verify by visiting any page — background should be `#07090A`, body text should be `#C6CCC8`.

## Phase 1 · App chrome (sidebar + top bar)

- [ ] Sidebar fill: `bg-bs-bg-smoke`. Border-right: `border-bs-border-100`.
- [ ] Active nav item: left rail in tier accent (Super = `bs-gold`, Tenant = `bs-green`, Client = `bs-info`), label in `text-bs-fg`, background `bg-bs-card`. Inactive items: `text-bs-fg-muted` with `hover:text-bs-fg hover:bg-bs-card`.
- [ ] Top bar: `bg-bs-bg` with hairline `border-b border-bs-border-100`. Height 56px. Notification + avatar buttons use ghost circular treatment (`bg-bs-card border border-bs-border` 36px circle).
- [ ] Page-content max-width 1180px, side padding 32–64px responsive, top padding 56px.

## Phase 2 · Page-by-page

### 🟢 Settings family — use **Template A (centered serif)**

For each page below, apply: centered `bs-eyebrow` → `bs-page-title` → `bs-page-subtitle`. Section cards = `bs-card bs-card-pad` with `bs-card-head` (icon tile + Cormorant 22px title + muted description).

- [ ] **Cookie & Privacy Settings** *(already closest to canonical — verify chips/banner conform)*
- [ ] **Store Settings**
- [ ] **Domain Configuration**
- [ ] **NFT License** (icon tile uses `gold` variant)
- [ ] **Dr. Green Integration**
- [ ] **Branding**
- [ ] **SEO Manager**
- [ ] **Email Templates**
- [ ] **Webhooks** (settings half — list half is Template C)
- [ ] **The Wire** (settings)
- [ ] **Cookie Settings** (storefront-side mirror)

### 🟢 Dashboard family — use **Template B (centered + stats)**

- [ ] **Overview** (Tenant) — header + 4-up stat row + chart cards
- [ ] **Store Analytics** — **drop the cream background**, replace bold-sans stat cards with `.bs-stat`, time-range pills become `.bs-btn-sm` (active = green, others = ghost)
- [ ] **Super Admin Overview** — same treatment, platform-wide metrics
- [ ] **Client Dashboard** — same treatment, customer-facing metrics

### 🟢 Data-table family — use **Template C (compact left header)**

- [ ] **Product Catalog** — keep drag handle (`⋮⋮`), strain badges become `bs-chip-gold`, stock chip becomes `bs-chip-green` (or `warn` for low / `danger` for out)
- [ ] **Order Management** — header is centered + stat row + table; status pills become `bs-chip-warn` (Pending / Pending Sync), `bs-chip-info` (Processing), `bs-chip-green` (Completed)
- [ ] **Customer Management** — **add the missing eyebrow + Cormorant page title**; stat cards adopt `.bs-stat`; table conforms to `.bs-table` style; "Deleted User" rows use the gold-tint avatar variant
- [ ] **Audit Logs** — replace solid green/red action pills with soft `bs-chip-green/warn/danger` system
- [ ] **The Wire** (list)
- [ ] **Webhooks** (list)
- [ ] **Tenants list** (Super Admin only)
- [ ] **Operators list** (Super Admin only)
- [ ] **Subscription / Billing** (Client)

## Phase 3 · Modals, drawers, toasts

- [ ] Modal: `bg-bs-card border border-bs-border rounded-bs-lg shadow-bs-card-hover`, scrim `bg-bs-bg-smoke/80 backdrop-blur-sm`. Title in Cormorant 22px. Close button is `bs-btn-text`.
- [ ] Drawer: same treatment, slide from right, 480px width on desktop.
- [ ] Toast: `bs-card` with role-coloured left rail (green for success, warn for pending, danger for error). Mono eyebrow + Inter body.
- [ ] Confirmation dialogs use `bs-btn-ghost` for cancel and `bs-btn-green` (or `bs-btn-danger` for destructive) for confirm. Destructive actions require typing the entity name to enable the confirm button.

## Phase 4 · Forms

- [ ] All inputs → `bs-input`. Labels → `bs-label`. Help text → `bs-help`.
- [ ] Field errors: red help text + input border `border-bs-danger/40` + soft `ring-bs-danger/15`.
- [ ] Toggles → `bs-toggle` (44×24, green when on).
- [ ] Selects → `bs-select` (matches input geometry but with the count-pill affordance).
- [ ] Multi-step forms use a thin progress strip at the top of the card (`bs-step-200` track, `bs-green` filled portion). No big numbered circles.

## Phase 5 · Audit

- [ ] `grep -r "#" --include="*.tsx" --include="*.css"` and review every literal hex. Replace with token reference.
- [ ] `grep -r "Inter" --include="*.tsx"` and verify no titles or metric numbers escaped to Inter.
- [ ] `grep -r "from-cyan\|to-teal\|via-emerald" --include="*.tsx"` to find lingering gradients on buttons; convert to `bs-btn-green` or `bs-btn-ghost`.
- [ ] Take screenshots of every migrated page, compare to the corresponding template in `Budstacks Admin Design System.html` § 05.

## Per-tier deltas (the only differences)

### Super Admin
- Sidebar accent dot/rail: `bs-gold`
- Has additional top-level nav: Tenants, Operators, Platform Settings, Billing, System Health
- "Impersonate" affordance on tenant rows uses `bs-btn-ghost bs-btn-sm`

### Tenant Admin
- Sidebar accent dot/rail: `bs-green`
- Tenant logo + name appears at top of sidebar (small, muted; not a hero element)

### Client Admin
- Sidebar accent dot/rail: `bs-info`
- Sidebar nav items are fewer; favour compact left header (Template C) on more pages since flows tend to be shorter
- Reduce eyebrow + serif treatment on transactional pages (e.g. order receipt) — there, just title + subtitle is fine

---

When this checklist is complete, all three admin surfaces share one design language. Run a final visual sweep by opening the same five page archetypes (settings · dashboard · data table · modal · form) in each tier side-by-side; they should be visually indistinguishable except for content.
