# Automatos v2 — landing site

Editorial, static-HTML replacement for the v1 React landing. Pure HTML/CSS/JS.
No build step. Served by a tiny Express container on Railway.

## Deploy (Railway — drop-in swap of v1)

1. Point the Railway service at this repo / branch.
2. Set the env vars below (same names as v1 — copy/paste from v1's service).
3. Deploy. The Dockerfile and `server.js` handle the rest.

### Env vars (set on Railway)

| Var | Purpose | Required |
|---|---|---|
| `VITE_AUTOMATOS_PUBLIC_KEY` | `ak_pub_*` — widget SDK auth (chat + blog). Allow-listed by origin server-side. | for chat + blog widgets |
| `VITE_AUTOMATOS_WORKSPACE_ID` | Workspace ID for the direct-fetch blog path used by `field-notes.html`. | for blog list |
| `VITE_AUTOMATOS_CHAT_AGENT_ID` | UUID of the public-facing chat agent (CONCIERGE). Empty → workspace default. | optional |
| `SMTP_HOST` | SMTP host. Defaults to `mail.privateemail.com`. | for contact form |
| `SMTP_PORT` | SMTP port. Defaults to `465`. | for contact form |
| `SMTP_USER` | SMTP user (the sending address). | for contact form |
| `SMTP_PASS` | SMTP password. | for contact form |
| `CONTACT_EMAIL` | Where to deliver contact submissions. Defaults to `SMTP_USER`. | optional |
| `PORT` | Set by Railway automatically. | n/a |

### How config flows in

`server.js` reads `_config.js.template` at container start and writes `_config.js`
with the substituted values. `_config.js` is `.gitignored` and `.dockerignored`,
so the in-tree version is whatever the last local run produced — never the
deployed values.

### Allowed domains on the public key

The `ak_pub_*` key is allow-listed by origin server-side. If v2 deploys on the
same domain as v1 (`automatos.app` / `www.automatos.app`), the existing key
works. New subdomain → add it to `allowed_domains` on the key first (no code
change can fix that — it's server-side).

## Local development

```sh
cp .env.example .env       # then fill in
npm install
npm start                  # http://localhost, or set PORT
```

For lightweight previews without the widgets / contact form,
`python3 -m http.server 8765` also works — chat will log a console warning and
stay hidden.

## Architecture

- **Static HTML pages**: `index` (One OS, the family, editions), `academy`,
  `contact`, `field-notes`, `research`, `blog-post`, `terms`, `privacy`,
  `cookies`, `eu-ai-act`, `eu-ai-act-checker` (served at `/eu-ai-act/checker`;
  `/eu-ai-act-checker` redirects there) and `404`. `server.js` serves only an allow-list of these pages and their
  assets (plus `images/`); every other path returns 404. `field-notes-five-tiers`
  is a draft and is not served. The dev pages (`pitch-mode`, `styleguide`,
  `landing-mobile`, `states-and-motion`) and the design artefacts live in
  `design/`, which is neither served nor copied into the image.
  `/pricing` and `/marketplace` redirect to `/#family` (8 Oct 2026: each
  product prices itself on its own site).
- **Shared scripts**: `_footer.js` (the family footer on every page), `_hub.js` (the home page's family hub), `_aiact-checker.js` (the EU AI Act checker), `_theme.js` (bone/pitch toggle), `_hero-picker.js`
  (hero image picker), `_chat.js` (Automatos
  chat widget), `_config.js` (runtime config carrier).
- **Server**: `server.js` — Express + nodemailer for `/api/contact`, an
  explicit allow-list for static files (add a file there when a live page
  starts to load it), runtime envsubst for `_config.js`.

## Investor portal

`/investors` is a signed-in area for investors: a document library with a PDF
viewer and downloads, and an admin area to upload documents and see who opened
what. Two parts:

- **App**: `investors/`, a Vite + React + TypeScript project with its own
  `package.json`. The Dockerfile builds it in its own stage; the runtime image
  carries only `investors/dist`, which `server/investors/static.js` serves at
  `/investors`.
- **API**: `server/investors/`, an Express router that `server.js` mounts at
  `/api/investors`, with its SQL migrations (`server/investors/migrations/`,
  applied at startup by `migrate.js`) and its tests.

**It is optional.** Without its required variables, or when a migration fails,
the portal is disabled and logs why: `/api/investors/*` answers
`503 {"error":"portal_unavailable"}`, `/investors` says the portal is
unavailable, and every other page of the site is served as before. Startup
never fails because of the portal: migrations run after the server starts
listening, and the API answers 503 until they finish.

### Env vars (set on Railway)

| Var | Purpose | Required |
|---|---|---|
| `INVESTORS_DATABASE_URL` | Postgres connection string for the portal's own role; its data lives in schema `investors`. | yes |
| `CLERK_SECRET_KEY` | Clerk secret key: verifies sign-in tokens and reads the signed-in user's name and email. | yes |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key, handed to the app at runtime through `_config.js`. A value that is not a `pk_test_`/`pk_live_` key is left out, and the app shows its signed-out page saying the portal is unavailable. | yes |
| `INVESTORS_AUTHORIZED_PARTIES` | Comma-separated origins a sign-in token may come from. Defaults to `https://automatos.app`. | optional |
| `INVESTOR_ADMIN_CLERK_IDS` | Comma-separated Clerk user ids allowed into the admin area. Empty → no admins. | for the admin area |
| `INVESTOR_DOCS_BUCKET` | Private S3 bucket that holds the documents. | for documents: all four, or the document routes answer 503 |
| `INVESTOR_DOCS_REGION` | That bucket's region. | for documents |
| `INVESTOR_DOCS_ACCESS_KEY_ID` | Access key of an IAM user limited to that bucket. | for documents |
| `INVESTOR_DOCS_SECRET_ACCESS_KEY` | That access key's secret. | for documents |
| `INVESTOR_ALERT_EMAILS` | Comma-separated recipients of the sign-up and first-open emails (each sent once per investor, or per investor and document). They go out through the contact form's `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` and `SMTP_PASS`, with its defaults, from `SMTP_USER`. Empty, or no `SMTP_USER`/`SMTP_PASS` → no alerts, and one warning at start. A failed send is logged and not retried. | optional |

### Checks

`.github/workflows/investors.yml` runs on every pull request and on pushes to
`main`: **server** (`npm test` against a Postgres 16 service), **app**
(typecheck, lint, unit tests and build in `investors/`; the production build
must not contain the E2E fake-auth marker), **e2e** (after app: Playwright,
Chromium only, against `npm run build:e2e` served by `vite preview`, every API
call mocked; full-page screenshots of each screen at 1280 and 390 px wide are
uploaded as the `investors-e2e-screenshots` artifact, the HTML report as
`investors-e2e-report`) and **docker** (the image build, no push). Playwright
runs in CI only.

```sh
npm test                                # server tests (vitest, in-process PGlite)
npm --prefix investors run typecheck    # also: lint, test, build
```

`INVESTORS_TEST_DATABASE_URL` points the server tests at a real Postgres
instead of PGlite (CI sets it to its service database). The tests drop the
`investors` schema in that database, so never point it at one that matters.

## Known gaps (post-deploy iterations)

- `field-notes.html` is currently 12 hand-written `.note` cards. Once live,
  swap to direct-fetch from
  `${apiBase}/api/widgets/blog/posts?workspace_id=${workspaceId}` and render
  into the same `.note` template.
- `/about` has no page yet (where About lives is still open). Privacy, Cookies
  and the EU AI Act pages exist (8 Oct 2026).
- Chat widget visual QA needs the SDK to actually mount, which requires real
  env on the deployed origin.
