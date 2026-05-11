# Automatos v2 — sitemap

Static-mock filenames map to future production routes. When porting to Astro/Next/Vite, point the framework's router at these slugs.

## Public routes

| Production route | Mock file | Status |
|---|---|---|
| `/` | `index.html` | wired |
| `/pricing` | `pricing.html` | wired |
| `/marketplace` | `marketplace.html` | wired |
| `/contact` | `contact.html` | wired |
| `/terms` | `terms.html` | wired |
| `/field-notes` | `field-notes.html` | wired |
| `/field-notes/why-the-router-is-five-tiers` | `field-notes-five-tiers.html` | wired (one example article) |
| `/404` (catch-all) | `404.html` | wired |

## Internal / system

| Production route | Mock file | Notes |
|---|---|---|
| `/_styleguide` (dev only) | `styleguide.html` | source of truth for primitives |
| `/_pitch-mode` (dev only) | `pitch-mode.html` | dark-mode coverage spec |
| `/_states-and-motion` (dev only) | `states-and-motion.html` | hover/focus/loading + schematic motion spec |
| n/a | `landing-mobile.html` | desktop reference for 375 + 768 breakpoints — collapse into `index.html` responsive at port time |
| n/a | `_preview.html` | local mock browser, not part of production site |

## Routes that don't exist yet (placeholder `href="#"`)

These appear in nav and CTAs but have no mock and no route — decide when porting:

- `/docs` — external docs site? Subdomain (`docs.automatos.ai`)? Decide before launch.
- `/signup` — likely redirects to `app.automatos.ai/signup`
- `/sign-in` — likely redirects to `app.automatos.ai/sign-in`
- `/app` — likely redirects to `app.automatos.ai`
- `/changelog` — could be a `/changelog` page or a Field Notes category
- `/privacy` — same chrome as `/terms`, content swap
- `/cookies` — same chrome as `/terms`, content swap
- `/research` — research papers index (v1 had this; secondary in brief)
- `/eu-ai-act` — credibility page (v1 had this; secondary in brief)

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
