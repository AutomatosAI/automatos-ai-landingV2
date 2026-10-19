# Automatos v2 — sitemap

Static-mock filenames map to future production routes. When porting to Astro/Next/Vite, point the framework's router at these slugs.

## Public routes

Trailing slashes (server.js): `/academy/`, `/contact/`, `/terms/`, `/privacy/`, `/cookies/`, `/eu-ai-act/`, `/field-notes/` and `/research/` answer with a 301 to the slashless path, keeping the query string (`SLASHED_CLEAN_URL`; `/research/` has its own route). `/eu-ai-act/checker/`, `/blog/{slug}/` and `/research/{slug}/` serve the page directly (200). `/blog/` 301s to `/field-notes`, and `/pricing/` and `/marketplace/` 301 to `/#family`, the same as their slashless forms.

| Production route | Mock file | Status |
|---|---|---|
| `/` | `index.html` | wired |
| `/pricing`, `/marketplace` | — | 301 → `/#family` (retired 8 Oct 2026) |
| `/academy` | `academy.html` | wired |
| `/contact` | `contact.html` | wired |
| `/terms` | `terms.html` | wired |
| `/privacy` | `privacy.html` | wired |
| `/cookies` | `cookies.html` | wired |
| `/eu-ai-act` | `eu-ai-act.html` | wired |
| `/eu-ai-act/checker` | `eu-ai-act-checker.html` | wired (route in server.js; `/eu-ai-act-checker` 301 → `/eu-ai-act/checker`) |
| `/field-notes` | `field-notes.html` | wired |
| `/research` | `research.html` | wired (route in server.js; `/research/` 301 → `/research`) |
| `/blog/{slug}`, `/research/{slug}` | `blog-post.html` | wired (routes in server.js; posts from the CMS API) |
| `/blog` | — | 301 → `/field-notes` (no blog index page) |
| `/field-notes/why-the-router-is-five-tiers` | `field-notes-five-tiers.html` | not served (draft; see README) |
| `/404` (catch-all) | `404.html` | wired |

## Internal / system

| Production route | Mock file | Notes |
|---|---|---|
| n/a (not served) | `design/styleguide.html` | source of truth for primitives |
| n/a (not served) | `design/pitch-mode.html` | dark-mode coverage spec |
| n/a (not served) | `design/states-and-motion.html` | hover/focus/loading + schematic motion spec |
| n/a (not served) | `design/landing-mobile.html` | desktop reference for 375 + 768 breakpoints — collapse into `index.html` responsive at port time |
| n/a (not served) | `design/_preview.html` | local mock browser, not part of production site |

## Routes that don't exist yet (placeholder `href="#"`)

These appear in nav and CTAs but have no mock and no route — decide when porting:

- `/docs` — external docs site? Subdomain (`docs.automatos.ai`)? Decide before launch.
- `/signup` — likely redirects to `app.automatos.ai/signup`
- `/sign-in` — likely redirects to `app.automatos.ai/sign-in`
- `/app` — likely redirects to `app.automatos.ai`
- `/changelog` — could be a `/changelog` page or a Field Notes category

## Field Notes — content needs

Currently one example article exists. The Field Notes index lists 12 entries (FN.01–FN.12). Each future article will be a separate route:

- `/field-notes/<slug>` — generated from the index entries.

Slug convention: kebab-case from the headline (e.g., FN.12 "Why the router is five tiers, and not four" → `why-the-router-is-five-tiers`).

## External destinations referenced

- `https://github.com/AutomatosAI` — org page
- `https://github.com/AutomatosAI/automatos-ai` — main repo
- `app.automatos.ai` — hosted product
- `mailto:hello@automatos.ai` — general inbound
- `mailto:press@automatos.ai`
- `mailto:security@automatos.ai`
- `mailto:legal@automatos.ai`
