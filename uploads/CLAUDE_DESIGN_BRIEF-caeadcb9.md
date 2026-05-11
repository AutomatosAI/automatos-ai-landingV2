# Automatos AI — Landing v2 Design Brief

**For:** the Claude Code session that will design and build `automatos-landing-v2`.
**Status:** strategic direction confirmed; mocks in progress; no code yet.
**Reference mock:** `Automatos Landing.html` (this directory) — 1,500-line static HTML, complete with mood swatches and photo swappers.

---

## 1. Context — what we're doing and why

Automatos AI's current marketing site (`automatos.app`, repo `automatos-ai-landing`) lives in the same visual bucket as every YC AI startup: dark theme, orange glow, dashboard preview card, integration logo carousel. It's competent and on-template, which is exactly the problem — it's anonymous in its category. A visitor can't tell us apart from a Lovable output.

**v2 is a deliberate break from that bucket.** Editorial / journal aesthetic — closer to Stripe Press, Linear's blog, Prime Intellect, or a printed publication than to a SaaS landing page. Off-white paper backgrounds, serif italic display type, dense informational chrome ("Plate / 002", "Fig. 04", chapter numbers, build version stamps), real photography, calm restraint. Anti-pattern bait — works because it's rare.

**Why this is the right move for Automatos specifically:**

- Open-source story (Apache 2.0, self-hostable) earns the right to look serious / research-grade rather than playful / SaaS-y.
- Audience is technical operators — founders, engineers, ops leaders. They've seen 1,000 dashboard hero mocks. They respond to density, editorial discipline, and "doesn't look like AI made it."
- Real product depth (router architecture, mission engine, marketplace, knowledge bases) benefits from being explained at length — chapters with numbered scaffolding — not crammed into a 3-second scroll.
- Editorial design photographs well in pitch decks and on LinkedIn — a quiet fundraising / hiring multiplier.

**What this is NOT:**

- Not a rebuild from scratch. Functionality and content clone from v1; only the design is new.
- Not a platform redesign. The app/dashboard keeps its current dark + orange identity. Marketing site only.
- Not a vibe redesign. Every choice ties to a positioning argument.

---

## 2. Approved v2 hero copy (canonical)

**Eyebrow / pill:** `Open` — Platform for AI Workforces

**H1:**
> An operating system for autonomous agent teams.

**Subhead:**
> Automatos is the open platform for AI workforces — design specialised agents, equip them with skills and knowledge, schedule their work, and run the whole room from one command centre.

This copy is locked. The mock matches it verbatim (with a slight phrasing variant that should be normalised to the above).

---

## 3. Risks to design around (acknowledged in mock; carry forward)

The first-draft mock is strong, but these gaps are real and need addressing in v2:

1. **No product surface anywhere.** Forest and mountain photography only — zero screenshots of the command centre, agents, missions running. SaaS buyers want to see what they're buying. **Fix:** add at least one product screenshot framed as an editorial plate (e.g., "Fig. 05 — Command Centre, in production"). Best of both worlds; doesn't break the aesthetic.

2. **Desktop-only mock.** `min-width: 1440px` on body. Editorial layouts collapse poorly without explicit mobile design. **Fix:** mobile + tablet comps must be designed *before* React work begins. Plan for ~1.5× the dev effort vs. a normal responsive redesign.

3. **Photography is the biggest ongoing cost.** Generic stock landscapes read as "another tech company that bought Unsplash." **Fix:** pick one curated photographic story (e.g., "calm autonomous systems in nature") and either commission one photographer or buy a Stocksy curation. Document the rules; refuse anything off-brand.

4. **Brand mark mismatch.** The orange ship doesn't sail in this aesthetic. The mock uses a tiny outlined `+` plate mark instead. **Decision required up front:** ship stays as the app/dashboard mark (already working on widgets); marketing site uses a refined wordmark — `Automatos·ai` in serif italic with the outlined `+` mark. Don't try to use both on the same surface.

5. **Editorial aesthetics demand great writing.** Every chapter heading is now public typography. If mid-page copy slips into AI-generic, the design exposes it instantly. **Commit:** higher writing bar everywhere, forever. If a section's copy is weak, kill the section, rewrite, then rebuild.

6. **Static — no breathing element.** Prime Intellect, Modal, Vercel all have one thing that moves in the hero. **Fix:** animate the router schematic in Chapter 02 — live routing decisions through cache → rules → semantic → LLM. One animated/breathing element only; don't add a second.

---

## 4. Page inventory — what to mock before any code

### Essential (block on these)

| # | Page | Notes |
|---|------|-------|
| 1 | **Landing — desktop** | Done (`Automatos Landing.html`). Refine to address risks above. |
| 2 | **Landing — mobile + tablet** | Critical gap. Editorial scaffolding has to be re-designed for narrow viewports — likely fewer chapters, longer scroll, stacked plates. Test every breakpoint at 375 / 768 / 1024 / 1440. |
| 3 | **Blog index** | Editorial site lives or dies on `/blog`. Treat as a "Field Notes" archive: dated entries, plate numbers, big serif heds, no card chrome. |
| 4 | **Blog post / article template** | Long-form serif body, drop caps optional, photo plates, footnote rules, "Field Note · 03 / 12" pagination. |
| 5 | **Pricing** | Treat as a rate card — matter-of-fact, mono-typed, no comparison-table garbage. |
| 6 | **Contact** | Single column, monospace form labels, restraint. |
| 7 | **404** | Easy to make great in this aesthetic. ("This plate is missing.") |
| 8 | **Legal template** | Privacy / Terms / Cookies share one chrome — full-bleed serif, narrow column, ToC on left. |
| 9 | **Component library / styleguide page** | Build first. Every primitive in every state. Source of truth for the rest of the site. |
| 10 | **Nav states** | Mobile drawer; scrolled state; mood-inverted variant. |

### Secondary (defer or simplify)

| # | Page | Notes |
|---|------|-------|
| 11 | **Research index + paper template** | v1 has `/research`; `feat/research-pages` branch is open in v1. Editorial style is a natural fit. Keep. |
| 12 | **EU AI Act / EU AI Act Checker** | Credibility + SEO play. Keep, simplify chrome. |
| 13 | **About** | Fold into landing as Chapter 05 or skip entirely. Editorial sites rarely need a separate About. |
| 14 | **Feature deep-dive pages** (LaunchMissions, ConnectYourWorld, EmpowerWithKnowledge, DesignYourAgents in v1) | Kill them as standalone routes. They become anchor chapters on the landing + long-form field-note articles. Saves four page designs and is more on-brand. |
| 15 | **Marketplace landing** | v2 launch can redirect to the app. Don't waste mock cycles. |

---

## 5. Light vs dark — settled

**Default `bone` (light cream).** Build `pitch` (dark charcoal) as a real, polished secondary mode — not a fallback for "couldn't decide."

**Why bone wins:**
- Bigger break from the pack. Every AI startup landing is dark; going light is the move that signals "this isn't AI-generic."
- Photography breathes. Cream frame makes photos the hero. Pitch desaturates the same images and the photo competes with UI chrome.
- Long-form retention. Blog and field notes do real positioning work. Light mode is where readers stay; dark long-form is a known retention killer.
- "Considered, mature" > "powerful infrastructure." Pitch says the second; bone says the first. The second is what every infra startup tries to signal — the first is rarer and harder to fake.

**Where dark earns its keep:**
- User toggle that respects `prefers-color-scheme` and persists. Expected, cheap.
- App/dashboard stays dark — that's its identity. Linear pattern: light marketing, dark product. Reinforces that the app is "the system you're entering."
- Optional: closer / CTA section flips to `pitch` deliberately for the "now you're entering the system" beat. Use this kind of mode shift once or twice per page max, or it looks indecisive.

**What to avoid:** building both modes equally. Doubles design QA forever. Photography has to work in both — you can't fake that. Pick bone, polish it relentlessly, ship pitch as respected-but-secondary.

**Real-world acceptance test:** load the bone mock on a phone outdoors in direct sunlight. Operators check on their phones between meetings. Dark editorial sites are unreadable in direct sun; light ones survive.

---

## 6. Stack recommendation

**Strongly consider Astro over Vite/React for v2.**

This is a content-heavy editorial site (landing, blog, research, legal, field notes). Astro gives you:
- MDX for long-form content — your blog and research pages will live here.
- Zero-JS-by-default — fast first paint, which the editorial aesthetic depends on.
- Per-component island hydration — drop in React only where you need interactivity (animated router schematic, contact form, theme switcher, mood-mood dev panel).
- Built-in image optimization — critical for a photography-heavy site.

**If staying with Vite/React for stack consistency with v1:** fine, but use route-level code splitting religiously and add `@vercel/og` or similar for static-rendered article previews.

**Either way: do not import shadcn/ui as default.** Those components will fight the editorial style at every turn. Cherry-pick deliberately (Dialog, form primitives, maybe Tooltip). Hand-build everything visible — buttons, eyebrows, photo cards, chapter scaffolds, schematic frames, footnote rules.

**Fonts (already in mock, all free Google Fonts):**
- `Instrument Serif` (display + italic body emphasis) — the signature voice
- `Geist` (sans, body, UI)
- `Geist Mono` (eyebrows, labels, build stamps, plate numbers)

---

## 7. Design system — build order

Do this **before** designing or coding any page beyond the landing reference:

1. **CSS variable mood system** — already in the mock (`bone`, `mist`, `pine`, `pitch`). Default `bone`. Each mood is a complete token swap (bg, fg, muted, rule, accent, photo-tint, grain-opacity).

2. **Type scale + 3 fonts** documented as tokens (`--t-eyebrow`, `--t-meta`, `--t-body`, `--t-lead`, `--t-h3`, `--t-h2`, `--t-h1`, `--t-display`).

3. **Layout primitives:**
   - `<Shell>` / `<Bound>` — page structure + horizontal padding
   - `<Rule>` / `<RuleVertical>` — hairline dividers
   - `<Eyebrow>` — mono uppercase tracking-wide labels
   - `<Pill>` — chapter pills, status badges
   - `<PhotoCard>` — framed photo with caption (`Fig. 01 — Workforce` / `Plate / 001`)
   - `<Schematic>` — boxed architecture diagrams (router flow, etc.)
   - `<ChapterMeta>` — three-column eyebrow row above chapter content
   - `<FieldNote>` — pull-quote testimonial format
   - `<MetricCell>` — numbered metric tile (M.01 / 100+ / note)
   - `<LogoCell>` — operator logos with optional case-study flag

4. **Then compose pages from primitives. Never one-off styles.**

5. **`/styleguide` route** — renders the component library page. Keeps the system honest as the site grows. Reference for human + Claude alike.

---

## 8. Photography rules

- **One curated photographic story.** Suggested theme: "calm autonomous systems in nature" — fog, stillness, scale, low saturation, single light source. Document the rules in `PHOTOGRAPHY.md`.
- **Refuse anything off-brand.** Generic stock = death.
- **Budget for one Stocksy curation or commission one photographer.** Not Unsplash for hero plates.
- **Test every photo in both modes** (`bone` + `pitch`) before adding to the library.
- **Per-photo tint overlay** is built into the mock (`--photo-tint`, `--photo-overlay`). Use it; never let a raw photo land on the page.

---

## 9. Brand mark — decided up front

- **App/dashboard:** keep the existing orange ship (`/brand/automatos-mark-hi.png`). Beloved, working on widgets.
- **Marketing site (v2):** refined wordmark — `Automatos·ai` in serif italic, paired with the outlined `+` plate mark from the mock.
- **Never use both on the same surface.**

---

## 10. Hard rules for the design build

**Don'ts:**
- No glow gradients, no "AI shimmer" lines, no orbiting integration logo carousels — the bucket you're escaping.
- No two animated/breathing elements per page. The router schematic in Ch.02 is the one. That's it.
- No glass morphism, no backdrop blur for "modern feel" — both are AI-template tells.
- No "Get started in seconds" / "Built for X" / "10x your Y" copy patterns. Editorial type punishes generic prose.
- No card-everywhere layouts — let the page breathe with rules and whitespace.

**Dos:**
- Plate numbers, chapter numbers, build stamps, "Fig. 01" captions — keep the editorial chrome dense.
- Italic serif for emphasis inside headlines (`autonomous`, `right agent`, `open`, `whole`, `costs`) — this is the signature pattern.
- Mono labels for everything not body or display — eyebrows, pills, metrics, captions, footer chrome.
- Three-line declarative headlines ("Hire the agents. Equip them with skills. Let them work.") — the rhythm.
- Real photographs with overlay tints, never illustrations or 3D renders.

---

## 11. Suggested order of operations

1. Spin up new repo `automatos-landing-v2` (Astro recommended).
2. Drop `Automatos Landing.html` mock into `MOCKS/` as canonical reference.
3. Design mobile + the four essential page templates (landing-mobile, blog index, article, styleguide) as static HTML mocks in `MOCKS/` *before* any component code.
4. Build the design system primitives + `/styleguide` route.
5. Compose landing first. Address the six risks (product surface, mobile, photography, brand mark, copy bar, animated schematic).
6. Ship to `landing-v2.automatos.app`. Share with operator-friendly X accounts (infra Twitter, Karpathy / Patel orbit). Measure reaction.
7. Decide based on signal: kill, iterate, or commit.
8. **Then** blog → research → pricing → legal → contact → 404.
9. Flip the main domain only after the editorial system has carried the landing for ~2 weeks of real traffic.

---

## 12. Files the new repo must include from day one

- `CLAUDE.md` — the rules in this brief, condensed for in-session use.
- `DESIGN_SYSTEM.md` — mood system, type scale, primitive component contracts.
- `PHOTOGRAPHY.md` — the curated visual story, photo rules, examples of yes/no.
- `MOCKS/` — static HTML mocks as canonical reference (this brief's `Automatos Landing.html` belongs here).
- `/styleguide` route — live component library.
- `CONTENT_MAP.md` — mapping from v1 routes to v2 routes (so content cloning is mechanical, not improvised).

---

## 13. Where v1 lives (for content cloning)

- **Repo:** `automatos-ai-landing` (Vite + React + Tailwind + react-helmet-async)
- **Pages directory:** `src/pages/` — this is the source of truth for content/copy you'll port.
- **SEO config:** `src/lib/seo/site.ts` — single source of truth for site name, tagline, OG defaults. Mirror this pattern in v2.
- **Existing OG generator:** `scripts/generate-og.mjs` (uses `@resvg/resvg-js`). v2 should ship with its own version, restyled for editorial aesthetic.
- **Approved hero copy:** see Section 2 above. Do not regenerate.

---

## 14. Success criteria for v2 landing

A v2 landing is shippable when:

- [ ] Mobile is as polished as desktop. Tested at 375 / 768 / 1024 / 1440.
- [ ] At least one product screenshot lives on the page, framed as an editorial plate.
- [ ] Photography library has been curated (not assembled from Unsplash searches).
- [ ] Both `bone` and `pitch` modes pass visual QA across the whole page; mode toggle persists; respects `prefers-color-scheme` first visit.
- [ ] Router schematic in Ch.02 animates live routing decisions.
- [ ] Brand mark decision is implemented (refined wordmark on marketing; ship stays in app).
- [ ] Outdoor-sun phone test passes (load on phone in direct sunlight; readable).
- [ ] No hero glow, no shimmer lines, no glass cards, no integration carousel.
- [ ] Copy across every chapter heading and section passes "would I tweet this sentence" test.
- [ ] `/styleguide` route exists and is current.

---

**End of brief.**

Hand this entire file to the Claude Code session that opens `automatos-landing-v2` for the first time. It should read as a complete strategic + tactical handoff — no prior conversation context required.
