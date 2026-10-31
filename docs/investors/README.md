# Investor portal

The investor portal is the signed-in area of the site at `automatos.app/investors`. People create an account, fill in a short profile, and can then read the documents the team publishes: PDFs in a page-by-page viewer with a slideshow mode, videos in the browser's own player, and other files as downloads. Admins upload and publish those documents, write the text pages (Overview, Team, Story, FAQ, Contact and the founder card's rows), and see who signed up, what they opened and how far they read. The portal runs inside the site's own Express server and has its own Postgres schema and private S3 bucket.

## Who uses it

| Who | What they do | Guide |
|---|---|---|
| Investors | Sign up, complete the profile, read and download documents, read the text pages | [User guide: for investors](USER-GUIDE.md#for-investors) |
| Admins | Manage documents and sections, read the overview and per-document stats, look up, export, block or delete investors, receive alert emails | [User guide: for admins](USER-GUIDE.md#for-admins) |
| Developers and operators | Change the code, run the checks, configure and deploy the service | [Technical guide](TECHNICAL.md) |

## The documents here

- [USER-GUIDE.md](USER-GUIDE.md): every screen, in plain words.
  - For investors: the signed-out page, signing up and in, the first-visit profile, Home, documents, the PDF viewer and present mode, video, the Team, Story, FAQ and Contact pages, the profile, what the portal records, emails, error messages and your data.
  - For admins: who is an admin, the overview, documents (create, upload, replace, versions, publish, reorder, preview, delete), document stats, investors (list, filters, CSV, detail, block, export, delete), sections and the founder card, alert emails, retention, and the light and dark moods.
- [TECHNICAL.md](TECHNICAL.md): architecture, the request path and its guards, every API route, authentication, the database schema and migrations, document storage, tracking events, email, retention, configuration, health, build and CI, deploy, testing, and how to add a section.

## Where the code lives

| Part | Path |
|---|---|
| The app (Vite, React, TypeScript; its own `package.json`) | `investors/` |
| App source: pages, layout, viewer, admin screens, every user-facing string | `investors/src/` (strings in `investors/src/strings.ts`) |
| Browser tests and their mocked API | `investors/e2e/` |
| The API (an Express router) and its composition root | `server/investors/index.js` |
| API routes | `server/investors/routes/` |
| SQL for the admin screens | `server/investors/queries/` |
| Migrations and the runner | `server/investors/migrations/`, `server/investors/migrate.js` |
| Server tests | `server/investors/__tests__/` |
| Where the site mounts the portal | `server.js` (`/api/investors` and `/investors`) |
| CI | `.github/workflows/investors.yml` |
| Image build | `Dockerfile` |
| Privacy text for the portal | `privacy.html`, section 07 (`#investors`) |

The repository's top-level `README.md` also lists the portal's environment variables and checks.

## Keeping these guides true

These guides describe the code on `main` at commit `8fc44cf`. Every statement in them was checked against that code. When a change alters what a screen shows, what a route does, or what is recorded, update the matching guide in the same pull request.
