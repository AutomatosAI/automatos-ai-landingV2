# Deliverables Page Redesign — Implementation Handoff

A friendly **"team output feed"** to replace the flat 2,393-card dumping ground. Power users still get the full filesystem via the Explorer tab; this page is the curated, non-techy face.

> **Run the prototype:** open `Deliverables Redesign.html` in a browser. Click any workspace card to drill in. Toggle Tweaks (top-right) for variations.

---

## The mental model shift

The old page is optimised for *"show me every file."* Real users come here to answer one of three questions, in this order of frequency:

1. **"What did my team make today?"** (most common)
2. **"Where's that thing I was working on?"** (project recall)
3. **"Show me all the X you've made"** (type browse — rarest)

The new page maps top-to-bottom onto those three questions.

---

## Page structure (top → bottom)

### 1. Page header
- Title: `Deliverables` with orange gradient on `Deliverables`
- Subtitle: `Files, reports & agent output`
- Tabs: `Outputs (17 new)` · `Blogs` · `Templates` · `Explorer`
  - The `Outputs` tab shows an unread count pill. The other tabs are unchanged.
  - `Explorer` still routes to the existing power-user file tree — keep that view.

### 2. "Today" hero (above the fold)
A single bordered card (radius 18, dark gradient bg, soft orange radial glow top-right).

**Top row** — left:
> Your team made **17 things** today — *14 are still unread.*
> Thursday, May 8 · 9 agents active

Top row — right: pill row of type counts (`8 images`, `4 slides`, `3 reports`, `1 blog post`, `1 doc`).

**Strip** — 6-up grid of *user-facing* artifacts created today (slides, reports, hero images, docs). NOT heartbeats. Cards have:
- 4:3 thumbnail (real preview where possible — see *Thumbnails* section below)
- Type badge top-left over thumbnail (`Image`, `Slide`, `Report`, `Doc`)
- Title with optional unread pip (orange dot, glowing)
- Meta line: `{AGENT} · {ago} ago`

### 3. "Active workspaces" (collections)
The **killer addition** vs. today. Group related deliverables into bundles. A user thinks *"the social thing from yesterday,"* not *"five PNG files and a markdown doc."*

**Examples** of valid workspaces:
- `Daily Social — Week 19` → 4 carousel slides + caption + publish report + variants
- `Marketplace Strategy` → reference workspace strategy + 3 supporting docs + pricing model
- `Onboarding Refresh` → 6 product screenshots + 3 step diagrams + email sequence
- `GA Weekly Brief — W19` → funnel report + channel breakdown + cohort chart + narrative

**Where do workspaces come from?**
This is a product decision we deferred. Three options to discuss with the team:
- **A. Auto-form from playbook runs** — every scheduled playbook execution becomes a workspace. Easiest. Recommended starting point.
- **B. Auto-form from agent jobs** — every agent task becomes a workspace. More granular, can get noisy.
- **C. Manual + smart** — users create workspaces and pin files; a few smart ones auto-suggest based on shared tags/topics.
- **Recommendation:** ship **A** first, layer **C** on later. Don't ship **B**.

**Card design:**
- Stack-of-3 thumbnail (back card rotated +2.5°, middle +1°, top straight) showing 3 most recent artifacts in the workspace
- Title + count pill (e.g. `8`)
- Meta row: `● new today` (orange) if any item is from today, then agent name, then `Updated 2h ago`
- 1-line summary text below

Grid: 4 columns at ≥1440px, 3 at ≥1100px, 2 at ≥800px, 1 below.

### 4. "Browse by type" — Netflix-style rows
Below the personal stuff, horizontal scrollable rows. **Slides & Decks** uses 3:4 portrait cards (decks photograph well portrait). All others use 4:3.

- 🎞 **Slides & Decks** — 142 items
- 📊 **Reports** — 63 items
- 🖼 **Images** — 486 items
- 📝 **Documents & Blog Posts** — 218 items

Each row has a `See all →` button on the right that drops into the existing type-filtered grid (the current page becomes the "see all" destination — don't throw away the work, just demote it from front door to drill-in).

### 5. System diagnostics strip (bottom)
**Heartbeats DO NOT belong in the main feed.** They're agent self-status, not user-facing deliverables. Treat them as infra noise.

Three modes (exposed as a Tweak — pick a default after user testing):
- **Hidden** — heartbeats only show in Explorer. *Strongly recommended default.*
- **Demoted** — collapsed strip showing `8 agent heartbeats today` with `Open in Explorer →` button. Users can opt to expand.
- **Expanded** — all heartbeats visible as a 2-column compact list (NOT cards — small icon + name + agent + status dot + ago).

### 6. Detail view (collection drill-in)
When a user clicks a workspace card, navigate to a detail page (or modal — same data either way).

**Layout:** 1.4fr / 1fr two-column.

**Left:**
- Back button: `← Back to Deliverables`
- Breadcrumb: `Deliverables / Active workspaces / {title}`
- Hero card with title, summary, and primary action row:
  - `Open all in Explorer` (primary, orange gradient)
  - `Download .zip`
  - `Share`
  - `Pin workspace`
- 2-column grid of every artifact in the workspace (full TypeCard treatment)

**Right (sidebar):**
- **Activity** card — vertical timeline of agent actions in this workspace. Use red dot for failures, orange for normal events.
- **Workspace info** card — source playbook, schedule, owner, file count, total size
- **Needs your attention** card — only if there are issues. Red-tinted box explaining what failed and a primary CTA to retry/fix.

---

## Design tokens

```
--bg:        #0a0a0a
--bg-2:      #111111
--surface:   #161616
--surface-2: #1c1c1c
--line:      #232323
--line-2:    #2c2c2c
--text:      #ededed
--text-2:    #a8a8a8
--text-3:    #6e6e6e

--orange:      #ff6b35
--orange-2:    #f7931e
--orange-soft: rgba(255,107,53,.12)

--green:  #34c759   (success / OK status)
--blue:   #4f8cff   (report accents)
--purple: #b07cff
--red:    #ff5a4d   (errors / needs attention)
--yellow: #ffc857   (warnings)
```

**Primary gradient** (buttons, brand mark, gradient title text): `linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)`

**Type:** `-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif` for UI. Slide thumbnails use `Georgia, serif` to mimic the actual deck templates.

**Radii:**
- Hero cards: `18px`
- Workspace / aside cards: `14–16px`
- Type cards: `12px`
- Pills: `999px`
- Stack-card thumbnails: `10px`

**Spacing rhythm:** 6, 8, 10, 12, 14, 16, 18, 22, 24, 28, 32, 36 — sticking to 2px increments.

---

## Thumbnails — fix this first

The current page shows broken-image placeholders for every "Created today" tile. **Three rules:**

1. **Always render a typed fallback** when a real thumbnail isn't available. Use a glyph + branded background per type:
   - Slide → cream `#f6f1e6` bg, big serif type fragment
   - Report → dark `#0e1420` → `#182030` gradient with bar-chart silhouette
   - Image → coloured radial gradient (the file's dominant colour if extractable, else brand orange)
   - Doc → off-white paper `#f8f6f2` with horizontal rule lines
2. **Never** show a broken-image symbol. That single visual issue makes the page feel busted.
3. For slide decks, generate a server-side preview from the first slide. For PDFs/docs, render the first page. For images, lazy-load the file with `loading="lazy"`.

---

## Component inventory

| Component | File | Notes |
|---|---|---|
| `TodayHero` | `deliverables-app.jsx` | Headline + stats pills + 6-card strip |
| `Collections` + `CollectionCard` | `deliverables-app.jsx` | Stack thumbnail, count pill, fresh marker |
| `TypeRow` + `TypeCard` | `deliverables-app.jsx` | Netflix horizontal scroll, supports tall portrait variant |
| `SystemStrip` | `deliverables-app.jsx` | Three-mode heartbeat treatment |
| `DetailView` | `deliverables-app.jsx` | Two-column drill-in with activity timeline |
| Thumbnail mocks | inline CSS classes | `.slide-thumb`, `.report-thumb`, `.img-thumb`, `.doc-thumb` — **replace with real previews in production** |

---

## What to ship in V1 vs. V2

**V1 — ship this first:**
- Today hero + stats pills
- Active workspaces (option A: auto-form from playbook runs)
- Netflix type rows (Slides, Reports, Images, Documents)
- Hidden heartbeats by default, with `Show diagnostics` toggle in user prefs
- Real thumbnail rendering with typed fallbacks
- Collection detail view with activity timeline

**V2 — defer:**
- Manual workspace creation + pinning
- Smart workspace suggestions (shared tags / topics)
- "Needs your attention" inbox (requires read-state tracking)
- Share / .zip download from collection card
- Search across workspaces

---

## Open product questions

1. **Workspace formation rules** — playbook-run-based vs. manual vs. hybrid? (See section 3 above.)
2. **Today hero copy** — *"Your team made 17 things today"* (feed posture) vs. *"You have 14 things to review"* (inbox posture). Different feel; needs user research.
3. **What counts as "unread"** — file open? file viewed in detail? marked-as-read? Affects pip logic.
4. **Heartbeat default** — Hidden (recommended) vs. Demoted. Hidden hides infra entirely from non-power users.
5. **Collection access via Explorer** — every workspace card and every detail view should have an `Open in Explorer →` link to bridge the friendly view and the file-tree view. This is the key IA contract.
