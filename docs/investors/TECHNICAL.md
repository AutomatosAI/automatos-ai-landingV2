# Investor portal: technical guide

How the portal is built, configured, tested and deployed. Paths are relative to the repository root. Code comments label the portal's design rules KP3, KP4 and so on; this guide names them where they apply, so you can search the code for them.

- [Architecture](#architecture)
- [Request path and the KP3 rule](#request-path-and-the-kp3-rule)
- [API routes](#api-routes)
- [Errors](#errors)
- [Authentication](#authentication)
- [Data](#data)
- [Migrations](#migrations)
- [Document storage](#document-storage)
- [Tracking events](#tracking-events)
- [Email alerts](#email-alerts)
- [Retention](#retention)
- [Rate limits](#rate-limits)
- [Configuration](#configuration)
- [Health and logs](#health-and-logs)
- [Build and CI](#build-and-ci)
- [Deploy](#deploy)
- [Testing](#testing)
- [Adding a section](#adding-a-section)

---

## Architecture

The portal has two parts, both served by the site's own Express server (`server.js`):

| Part | Where | What it is |
|---|---|---|
| The app | `investors/` | A Vite + React 18 + TypeScript single-page app with its own `package.json`. Routing with react-router 6 (`BrowserRouter`, basename `/investors`), data with TanStack Query 5, UI from Tailwind 3 and Radix components, PDFs with react-pdf 9 and pdfjs-dist 4.8, Markdown with react-markdown 9, admin charts with recharts 2, sign-in with `@clerk/clerk-react` 5, response checking with zod 3. Built with base `/investors/` (`investors/vite.config.ts`). |
| The API | `server/investors/` | An Express router built by `createInvestorsPortal()` in `server/investors/index.js`: Postgres through `pg` (schema `investors`), Clerk session verification through `@clerk/backend`, document storage through the AWS SDK v3 (S3, presigned URLs), alert emails through nodemailer, validation with zod, per-investor limits with express-rate-limit. |

`server.js` wires them in:

- `app.use("/api/investors", investorsPortal.apiRouter)`, mounted **before** the site's global `express.json()`, so the portal parses its own bodies.
- `app.use("/investors", investorsPortal.appRouter)`, mounted before the site's static allow-list.
- `investorsPortal.start()` runs inside `app.listen`'s callback, so the site is already serving when the portal opens its database.

```
Browser
  GET  /investors/...             -> server/investors/static.js  -> investors/dist (index.html, hashed assets)
  GET  /_config.js                -> server.js allow-list         -> window.AUTOMATOS_CONFIG (Clerk publishable key)
  *    /api/investors/...  Bearer -> server/investors/index.js    -> Postgres schema "investors", Clerk, S3, SMTP
  PUT / GET presigned URL         -> the private S3 bucket, directly (uploads, reads)
  sign-in modal, session tokens   -> Clerk
```

### The app's build and runtime config

- `investors/index.html` loads `/_config.js` as a classic script before the app bundle. `server.js` writes `_config.js` at start from `_config.js.template`, filling `clerkPublishableKey` only when `CLERK_PUBLISHABLE_KEY` looks like a `pk_test_` or `pk_live_` key. The app reads `window.AUTOMATOS_CONFIG.clerkPublishableKey` and checks it the way Clerk does (`investors/src/config.ts`). One build serves every environment; nothing is baked in at build time (KP9).
- With no usable key, the app runs signed-out only and the signed-out page says the portal is unavailable (`investors/src/auth/AuthProvider.tsx`).
- The admin screens, the PDF viewer and pdf.js are separate chunks loaded on demand; investors never download the admin code (`investors/src/App.tsx`). The pdf.js worker ships with the app, not from a CDN (`investors/src/lib/pdfjs.ts`).
- `investors/index.html` sets `<meta name="robots" content="noindex">` and the portal's own tab icon (`investors/src/assets/favicon/`).

### Static serving

`server/investors/static.js`:

- `/investors/assets/*` comes from `investors/dist/assets`, cached for a year as immutable. A missing asset is a plain 404, never `index.html`.
- Every other GET under `/investors` answers `index.html` with `Cache-Control: no-store`, so the app's router owns those paths and a deploy shows at once.
- A path with a `..` segment (raw or percent-encoded), a backslash or a NUL is refused with 400.
- If the build is missing, `/investors` answers 503 with a one-line HTML page that links `/contact`, and logs it once. The rest of the site is unaffected.

### Optional by design (KP4)

The portal can never take the site down:

- Without one of its three required variables, the portal is `disabled`: every API path except `GET /health` answers `503 {"error":"portal_unavailable","state":"disabled"}`, the app shows its unavailable message, and every other page of the site works as before.
- Migrations run after the server is listening. Until they finish the state is `starting` and the API answers 503 the same way. A failed migration disables the portal, not the site.
- Without document storage, only the document routes answer `503 {"error":"storage_unavailable"}`; the rest of the portal works.
- Without alert recipients or SMTP credentials, the alert hooks do nothing.
- The factory `createInvestorsPortal()` never throws and `start()` never rejects.

---

## Request path and the KP3 rule

**KP3: `GET /api/investors/health` is the only public route. Every other API route sits behind the investor guard, and every `/admin` route also behind the admin allowlist.** The order of the router built by `createApiRouter()` in `server/investors/index.js` is the security model:

1. `noStore`: every API response carries `Cache-Control: no-store`.
2. `GET /health`: the only route before the guard.
3. `readyGate`: answers `503 {"error":"portal_unavailable","state":...}` unless the state is `ready`.
4. `investorGuard` (`requireInvestor` in `server/investors/auth.js`): verifies the Clerk session token and loads the investor; see [Authentication](#authentication).
5. `express.json({ limit: "64kb" })`: bodies are read only after the guard. A larger body is a 413.
6. `/admin` → `requireAdmin`: `403 {"error":"forbidden"}` unless the token's user is in `INVESTOR_ADMIN_CLERK_IDS`.
7. The route sets, in order: me, admin documents, documents, events, admin investors, admin overview, sections.
8. Anything unmatched: `404 {"error":"not_found"}`.
9. The error handler: a 4xx keeps its status and answers `{"error":"bad_request"}`; anything else is logged with the method and path (no query string, control characters replaced, at most 300 characters) and answers `500 {"error":"internal_error"}`. No stack trace ever reaches a response (KP15).

Who is asking comes only from the verified bearer token, never from a body, query string, other header or cookie. Every request body is parsed with a zod schema that drops unknown keys, so an investor ID sent in a body is never read.

`server/investors/__tests__/route-coverage.test.js` enforces KP3. It walks the router's stack and fails if any route other than `GET /health` can be reached without the investor guard, or any `/admin` path without the admin gate. Then it calls every route it found: each must answer 401 without a token, and each `/admin` route 403 to a signed-in non-admin. The guards are recognised by a symbol tag (`GUARD` in `auth.js`), not by function name.

---

## API routes

All paths are under `/api/investors`. "Investor" means behind the investor guard; "Admin" means behind the investor guard and the admin allowlist. Limits are per investor per minute (see [Rate limits](#rate-limits)).

| Method | Path | Guard | What it does | Source |
|---|---|---|---|---|
| GET | `/health` | public | `{state}`: `disabled`, `starting` or `ready` | `index.js` |
| GET | `/me` | Investor | The signed-in investor (without the Clerk user ID), `isAdmin` and `profileComplete` | `routes/me.js` |
| PUT | `/me` | Investor, 10/min | Saves the profile form. The first save sets `profile_completed_at`, writes a `profile_completed` event and fires the sign-up alert. Answers like `GET /me`. | `routes/me.js` |
| GET | `/documents` | Investor; 503 without storage | Published documents that have a file, in `sort_order, created_at, id` order. Never the storage key, the flags or the sort order. | `routes/documents.js` |
| POST | `/documents/:id/link` | Investor, 30/min; 503 without storage | Body `{mode: "inline" \| "download"}`. Records `document_open` or `document_download` with the version, then answers `{url, expiresIn: 300}`, a presigned GET. An unpublished, missing or file-less document, or an ID that is not a UUID, is a 404. May fire the first-open alert. | `routes/documents.js` |
| POST | `/sessions` | Investor, 20/min | Opens a visit, storing the user agent (300 characters at most). Answers `201 {sessionId}`. | `routes/events.js` |
| POST | `/events` | Investor, 120/min | Body `{sessionId?, heartbeat?, events[]}`, at most 50 events. Records the valid events, drops the rest, moves the visit's heartbeat. Answers 204. | `routes/events.js` |
| GET | `/sections` | Investor | Published sections `{slug, title, bodyMd, updatedAt}`, in `sort_order, slug` order | `routes/sections.js` |
| GET | `/admin/overview` | Admin | 7-day counts, a 30-day daily series (UTC) and the 20 latest events | `routes/admin-overview.js`, `queries/overview.js` |
| GET | `/admin/documents` | Admin; 503 without storage | Every document, with `sortOrder`, `published`, `alertOnFirstOpen` and `hasFile` | `routes/admin-documents.js` |
| POST | `/admin/documents` | Admin; 503 without storage | Body `{title, description?, category, kind, alertOnFirstOpen?}`. Creates an unpublished document at the end of the list. `201 {document}`. | `routes/admin-documents.js` |
| PATCH | `/admin/documents/:id` | Admin; 503 without storage | Any of `title, description, category, kind, sortOrder (0 to 1,000,000), published, alertOnFirstOpen`, at least one. Publishing without a file is `409 no_file`. | `routes/admin-documents.js` |
| DELETE | `/admin/documents/:id` | Admin; 503 without storage | Deletes the row and its file in one transaction (rolled back if storage refuses). Events keep their rows with `document_id` NULL. 204. | `routes/admin-documents.js` |
| POST | `/admin/documents/:id/upload-url` | Admin; 503 without storage | Body `{fileName, contentType, contentLength, pageCount?}`. Answers `{url, key, headers, expiresIn: 900}`, a presigned PUT for the next version. | `routes/admin-documents.js` |
| POST | `/admin/documents/:id/finalize` | Admin; 503 without storage | Body `{key, pageCount?}`. Checks the uploaded object and records it as the new version; removes the replaced file. | `routes/admin-documents.js` |
| POST | `/admin/documents/:id/preview-link` | Admin; 503 without storage | A presigned inline GET for the current file, published or not. Records no event. `409 no_file` without a file. | `routes/admin-documents.js` |
| GET | `/admin/documents/:id/stats?version=N` | Admin; 503 without storage | One version's readers, opens, downloads, average time, per-page dwell and reach, and the versions with events. Default: the current version. | `routes/admin-documents.js`, `queries/document-stats.js` |
| GET | `/admin/investors` | Admin | Query `q` (up to 200 characters; name, email or firm), `type`, `source`, `sort`, `dir`, `page`. Answers `{investors, total, page, pageSize: 50}`. | `routes/admin-investors.js`, `queries/investor-list.js` |
| GET | `/admin/investors.csv` | Admin | The same filter and sort, every page, as a CSV attachment `investors-YYYY-MM-DD.csv` | `routes/admin-investors.js`, `csv.js` |
| GET | `/admin/investors/:id` | Admin | The investor (with the Clerk user ID) and a summary per document | `routes/admin-investors.js`, `queries/investor-detail.js` |
| GET | `/admin/investors/:id/events?page=N` | Admin | The timeline, newest first, 50 per page | `routes/admin-investors.js` |
| GET | `/admin/investors/:id/export` | Admin | The profile, visits and every event as a JSON attachment `investor-<id>.json` | `routes/admin-investors.js` |
| PATCH | `/admin/investors/:id` | Admin | Body `{blocked}`. Blocking yourself is `409 cannot_block_self`. | `routes/admin-investors.js` |
| DELETE | `/admin/investors/:id` | Admin | Deletes the investor; sessions, events and alert records cascade. The Clerk account is not touched. 204. | `routes/admin-investors.js` |
| GET | `/admin/sections` | Admin | Every section, with `sortOrder`, `published` and `updatedBy` | `routes/sections.js` |
| GET | `/admin/sections/:slug` | Admin | One section | `routes/sections.js` |
| PUT | `/admin/sections/:slug` | Admin | Body `{title, bodyMd, published}`, all three. Records the admin's Clerk user ID in `updated_by`. An unknown slug is a 404; there is no create or delete. | `routes/sections.js` |

Notes:

- `:id` must be a UUID; anything else is a 404 before Postgres is asked (`documentIdParam` in `server/investors/documents.js`). A section slug must match `^[a-z0-9_-]{1,60}$`.
- The investor list's `sort` is one of `name, firm, created_at, last_seen_at, sessions, total_ms, docs_opened, downloads` and `dir` one of `asc, desc` (default `last_seen_at desc`). Every sort and direction pair is a statement written at load time from constants; the `ORDER BY` is never built from the request.
- `storage_unavailable` is answered by a gate mounted on `/documents` and `/admin/documents`, so it covers every path under them, stats included.

---

## Errors

The server answers errors as `{"error": "<code>"}` with a status. The app turns codes into words (`investors/src/api/errors.ts`, `investors/src/strings.ts`) and never shows the code.

| Status | Code | When |
|---|---|---|
| 400 | `invalid`, with `fields: {<field>: <code>}` | A body or query failed validation. Field codes: `required`, `too_long`, `invalid_option`, `invalid`, and on events `too_many` (`server/investors/validation.js`) |
| 400 | `content_type_not_allowed`, `invalid_size`, `file_too_large` | An upload outside the storage limits |
| 400 | `bad_request` | Any other client error from Express, such as malformed JSON |
| 401 | `unauthenticated` | No token, a rejected token, or a session that is not active |
| 403 | `email_required` | First sign-in by a Clerk user with no verified email |
| 403 | `blocked` | The investor is blocked |
| 403 | `forbidden` | An `/admin` route for a non-admin |
| 404 | `not_found` | No such route, document, investor or section |
| 409 | `no_file`, `not_uploaded`, `stale_upload`, `cannot_block_self` | See the routes above |
| 413 | `bad_request` | A body over 64 kB |
| 429 | `rate_limited` | Over a per-investor limit |
| 500 | `internal_error` | Anything unexpected (logged) |
| 503 | `portal_unavailable`, with `state` | Portal disabled or still starting |
| 503 | `storage_unavailable` | Document routes without the S3 config |

---

## Authentication

### In the browser

- `investors/src/auth/clerk-auth.tsx` is the only module that touches Clerk. The rest of the app uses the seam in `investors/src/auth/` (`useAuthState`, `useAuthActions`, `SignedInGate`, `getToken`), so the e2e build can swap Clerk for a fake (KP10).
- Sign-in and sign-up open Clerk's own modal (`clerk.openSignIn`, `clerk.openSignUp`) with a return path inside `/investors`; sign-out returns to `/investors`. Which sign-in methods appear is set in the Clerk instance, not in this repository.
- The API client (`investors/src/api/client.ts`) asks Clerk for a fresh session token on every request and sends it as `Authorization: Bearer <token>`, with `credentials: "omit"` and `cache: "no-store"`. The token is the only credential; no cookie is sent.
- Signing out clears every cached answer (`useClearCacheOnSignOut`) and stops the tracker, dropping its queue.

### On the server

`server/investors/auth.js` verifies the session token itself, on every request:

1. **Read the token** from `Authorization: Bearer <token>`. A header over 8192 characters is refused unread. Cookies, Clerk's `__session` included, are never read.
2. **Key ID gate.** The token must be a JWT whose header names a `kid`. The guard keeps the Clerk instance's key IDs, read from Clerk's JWKS through the backend SDK (`jwks.getJwks()`) and re-read after 10 minutes. An unknown `kid` triggers a re-read at most once every 30 seconds, so a rotated key is picked up. A token whose `kid` is still unknown is refused before Clerk is asked, so forged tokens with random key IDs cannot turn into Clerk API calls.
3. **Verify** with `@clerk/backend`'s `verifyToken(token, { secretKey, authorizedParties })`: signature, expiry, and the token's `azp` must be one of `INVESTORS_AUTHORIZED_PARTIES`. Clerk skips the `azp` check for an empty list, so the verifier refuses to start with one.
4. **Subject.** The user is the `sub` claim (up to 255 characters). A token whose `sts` claim is present and not `active` (an unfinished Clerk session task) counts as signed out.
5. **Find or create the investor** by `clerk_user_id`. On first sight the guard looks the user up in Clerk (`users.getUser`, cached per process for 10 minutes, up to 1000 entries; failed lookups and users without a verified email are not cached). It takes the primary email if verified, otherwise the first verified one; with none it answers `403 email_required`. The row and its first `signed_in` event are inserted in one statement; a concurrent first request loses `ON CONFLICT` and reads the winner's row. Later requests read the row, so a change of email or name in Clerk does not reach the portal.
6. **Blocked** investors get `403 blocked`.
7. **Touch.** `last_seen_at` is written at most once a minute. If the previous `last_seen_at` is more than 30 minutes old and there is no `signed_in` event in the last 30 minutes, a new `signed_in` event is written.
8. **Pass on** `req.investor` (frozen, camelCase columns) and `req.isAdmin` (the token's user ID is in `INVESTOR_ADMIN_CLERK_IDS`).

A rejected token is logged as `[investors] token rejected: <reason>`, never with the token or Clerk's message (which quotes the claims). The Clerk SDK is imported lazily, on the first request.

Variables: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `INVESTORS_AUTHORIZED_PARTIES`, `INVESTOR_ADMIN_CLERK_IDS`.

---

## Data

Everything lives in the Postgres schema `investors`. `server/investors/db.js` is the only module that talks to Postgres: every statement is parameterized and schema-qualified (KP7). The pool holds at most 5 connections, with a 30-second idle timeout, a 10-second connect timeout and `application_name` `automatos-investors`. `int8` columns come back as numbers.

The tables, from `server/investors/migrations/001_init.sql`:

| Table | Holds | Key columns |
|---|---|---|
| `investors` | One row per person who signed in | `id` (uuid), `clerk_user_id` (unique), `email`, `name`, `firm`, `title`, `investor_type`, `linkedin_url`, `cheque_size`, `country`, `source`, `marketing_opt_in`, `marketing_opt_in_at`, `profile_completed_at`, `blocked`, `created_at`, `last_seen_at` |
| `documents` | The library | `id`, `title`, `description`, `category`, `kind`, `s3_key`, `file_name`, `content_type`, `size_bytes`, `page_count`, `version`, `sort_order`, `published`, `alert_on_first_open`, `created_by`, `created_at`, `updated_at` |
| `sections` | Admin-edited Markdown | `slug` (primary key), `title`, `body_md`, `sort_order`, `published`, `updated_at`, `updated_by` |
| `sessions` | One row per visit; no IP address | `id`, `investor_id`, `started_at`, `last_heartbeat_at`, `user_agent` |
| `events` | Everything recorded | `id` (bigserial), `investor_id`, `session_id`, `type`, `document_id`, `document_version`, `page`, `duration_ms` (0 to 600000), `data` (jsonb), `created_at` |
| `alerts_sent` | One row per alert email sent | `investor_id`, `kind` (`signup` or `first_open`), `document_id`, `sent_at` |
| `schema_migrations` | Applied migration files (created by `migrate.js`, not by 001) | `name`, `applied_at` |

CHECK constraints hold the fixed lists: `investor_type` (`vc, angel, family_office, corporate, accelerator, other`), `cheque_size` (`lt_50k, 50k_250k, 250k_1m, gt_1m`), `source` (`websummit, intro, website, other`), document `kind` (`pdf, video, spreadsheet, slides, doc, other`) and event `type` (see [Tracking events](#tracking-events)).

Foreign keys:

- Every foreign key to `investors.id` cascades: deleting an investor deletes their sessions, events and alert records.
- `events.document_id` and `events.session_id` are `SET NULL` on delete, so a deleted document's events keep their rows.
- `alerts_sent.document_id` cascades: a deleted document takes its first-open records with it.

Indexes: `alerts_sent_once_idx`, unique on `(investor_id, kind, COALESCE(document_id, <zero uuid>))`, so a sign-up alert (no document) can be recorded only once; `events (investor_id, created_at DESC)`, `events (document_id, type)`, `events (type, created_at DESC)`, `events (session_id)` and `sessions (investor_id, started_at DESC)`.

The admin screens' aggregates (overview, investor list, investor detail, document stats) are computed in SQL in `server/investors/queries/`; no table is read into Node.

---

## Migrations

| File | What it does |
|---|---|
| `001_init.sql` | Creates the six tables and their indexes |
| `002_sections_seed.sql` | Seeds `overview`, `team`, `faq` and `contact` (sort order 1 to 4), empty and unpublished |
| `005_founder_card_section.sql` | Seeds `founder_card` (sort order 5), empty and unpublished |
| `006_story_section.sql` | Seeds `story` (sort order 6), empty and unpublished |

Numbers 003 and 004 are reserved for planned migrations that are not in the repository. The gap is allowed.

`server/investors/migrate.js` applies them at startup (KP8):

- **Names** must match `NNN_name.sql`: three digits, then lower-case letters, digits and underscores. Files are applied in name order. A misnamed `.sql` file, or two files with the same number, fails the run instead of being skipped or applied out of order.
- **Gaps are allowed**: only the order matters.
- **Bootstrap**: creates the `investors` schema only when `pg_namespace` lacks it (in production it already exists, owned by the portal's role, which may not hold CREATE on the database), then creates `schema_migrations` if needed.
- **One transaction per file**, holding the transaction-scoped advisory lock `724001`, so two instances starting together (a deploy overlapping the old container) apply each file once. A file already recorded in `schema_migrations` is skipped. A failing file is rolled back and not recorded.
- **On failure** the portal's state becomes `disabled` with the reason `migration_failed: <file>`, the pool is closed, and the log names the failing file and the error's message (only the message: the error object may hold the connection string). The site keeps running.
- **Never edit a shipped file.** Add the next number instead. Seed files use `INSERT ... ON CONFLICT DO NOTHING`, so a row that already exists is kept as it is.

---

## Document storage

`server/investors/s3.js` (KP11). Documents live in a private S3 bucket, reached only through short-lived presigned URLs.

- **Keys** are always `documents/<documentId>/v<version>/<safeFileName>`. The store refuses any other key, so it can never read or delete outside that prefix. `safeFileName` keeps the last path segment, folds accents, turns every run of other characters into one `-`, and keeps the extension within 120 characters.
- **Allowed types**: `application/pdf`, `video/mp4`, `text/csv`, and the Office Open XML spreadsheet, presentation and word-processing types (XLSX, PPTX, DOCX).
- **Size**: 1 byte to 262,144,000 bytes (250 MB).
- **PDF pages**: the admin's browser counts them with pdf.js before uploading (`investors/src/admin/page-count.ts`); at most 2000. The server stores the count only when the content type is PDF.
- **Upload**: a presigned PUT, valid for 15 minutes, whose signature binds `content-type` and `content-length`, so the browser must send exactly the file it declared.
- **Read**: a presigned GET, valid for 5 minutes, that tells S3 which `Content-Disposition` to answer with: `inline` for viewing, `attachment` for download, with the original file name (an ASCII `filename` and an RFC 5987 `filename*`).
- **Client**: the AWS SDK is imported lazily, on first use, with checksums only when S3 requires them (the SDK's default would put the CRC32 of an empty body into a presigned PUT). Nothing in `s3.js` logs, because a presigned URL is a credential until it expires.

### Upload, step by step

1. The browser checks the type and size (`investors/src/admin/file-types.ts`) and, for a PDF, counts the pages.
2. `POST /admin/documents/:id/upload-url`: the server builds the key for the next version (the current version while the document has no file, the one after it for a replace) and presigns the PUT.
3. The browser PUTs the file straight to S3 with the returned headers, reporting progress (`investors/src/admin/xhr-put.ts`). S3 answers 403 once the URL has expired.
4. `POST /admin/documents/:id/finalize`: the server checks the key is the one it would build for this document and version, HEADs the object, and checks its type and size again (a rejected object is deleted). Under a row lock it checks the version has not moved on (`409 stale_upload` otherwise) and records the key, file name, type, size, page count and version. It then deletes the replaced file. That delete is best effort: a failure is logged with the key's folder only (`documents/<id>/v<n>`) and the request still succeeds.

Finalizing does not change `published`, so a replacement reaches investors at once.

### Concurrency

Issuing a link and recording a batch of events read the document row `FOR SHARE`; an admin's edit, replace or delete takes it `FOR UPDATE`. So an unpublish, replace or delete waits for an in-flight link, or the link waits and re-checks the row. A published document always has a file: the publish check runs under the same lock as finalize and delete.

### Viewing

pdf.js runs with `disableRange: true` and `isEvalSupported: false` (`investors/src/viewer/pdf-options.ts`): the whole file comes in one GET, so a 5-minute link is only needed while it loads, and the bucket's CORS rule needs no Range header. When storage refuses an expired link (pdf.js reports 403, or the video element fails to fetch), the viewer asks for a new link once per cycle; "Try again" starts a new cycle (`investors/src/viewer/link-model.ts`). The link query is never refetched on focus and is dropped when the viewer closes, because every link the server issues is recorded as an open.

### When storage is unavailable

`config.s3` is null unless all four `INVESTOR_DOCS_*` variables are set. Then every route under `/documents` and `/admin/documents` answers `503 {"error":"storage_unavailable"}`. The app keeps its pages up and shows "Documents are unavailable right now" where the documents would be (investors), or "File storage is not set up yet" (admins).

---

## Tracking events

Every event is a row in `investors.events`. The CHECK constraint allows seven types:

| Type | Written by | When | Columns used |
|---|---|---|---|
| `signed_in` | Server (`auth.js`) | First sight, and on return after more than 30 minutes away | none |
| `profile_completed` | Server (`routes/me.js`) | The first profile save | none |
| `document_open` | Server (`routes/documents.js`) | Every `inline` link issued | `document_id`, `document_version` |
| `document_download` | Server (`routes/documents.js`) | Every `download` link issued | `document_id`, `document_version` |
| `page_view` | Client, via `POST /events` | A PDF page was at least 50% visible, in a visible tab, for at least 1000 ms | `document_id`, `document_version`, `page`, `duration_ms` |
| `section_view` | Client, via `POST /events` | A Team, Story, FAQ or Contact page was open in a visible tab for at least 1000 ms | `duration_ms`, `data.section` |
| `video_progress` | Client, via `POST /events` | A video passed 25, 50, 75 or 100%, once each per viewing | `document_id`, `document_version`, `data.percent` |

The client may send only `page_view`, `section_view` and `video_progress`; opens and downloads are written when the link is issued, in the same transaction, so a link is never handed out unrecorded. Admin previews write nothing.

### The browser's tracker

`investors/src/tracking/tracker.ts` starts once a user is signed in (one tracker per account, `TrackingProvider.tsx`):

- It opens a visit with `POST /sessions`, sends a heartbeat every 30 seconds while the tab is visible, and flushes queued events every 10 seconds.
- When the tab is hidden or the page goes (`pagehide`), it sends the whole queue at once with `fetch` and `keepalive`, using the last token it saw (it cannot wait for a fresh one; `sendBeacon` cannot set the Authorization header). Each 10-second tick asks for a token even with nothing to send, to keep that cached token fresh.
- The queue keeps the newest 200 events; a request carries at most 50.
- A batch that meets no answer, a 5xx or a 429 goes back in the queue; one the server refuses with another 4xx is dropped. A visit the server refuses (blocked, no email, forbidden) is not retried.
- Durations are clamped to 0 to 600000 ms on both sides.

### What the server checks in a batch

`server/investors/routes/events.js`:

- The batch is at most 50 events (the 64 kB body limit applies first). Unknown keys, such as an investor ID, are dropped.
- An event is dropped, and the rest of the batch kept, when it names a document the investor cannot see (unknown, unpublished or without a file), a version newer than the current one, or a page past the current version's `page_count` (an older version, or a document without a page count, allows pages 1 to 2000).
- A `sessionId` the investor does not own is ignored: the events are kept without it and the heartbeat is skipped.
- The batch goes in as one statement.

---

## Email alerts

`server/investors/alerts.js` and `server/investors/alert-messages.js` (FR-12 in code comments).

- **Hooks**: `signup`, called after an investor's first profile save commits (`routes/me.js`); `firstOpen`, called after an investor's first `inline` link to a document whose `alert_on_first_open` is set commits (`routes/documents.js`). "First" means no earlier `document_open` by that investor for that document, checked under a lock on the investor's row so two opens at once cannot both be first.
- **After the response**: hooks run through `callAlert()`, on `setImmediate`, so a slow or failing hook never delays or fails the request.
- **Dedupe**: each hook first claims the alert with `INSERT INTO investors.alerts_sent ... ON CONFLICT DO NOTHING` on `alerts_sent_once_idx`. Only the claim that inserted a row sends. A failed send is logged by error name and code and not retried, so nobody gets the same alert twice.
- **Transport**: nodemailer over SMTP with implicit TLS (`secure: true`), using the contact form's `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` and `SMTP_PASS` and their defaults (`SMTP_DEFAULTS` in `server/investors/config.js`). From: `SMTP_USER`, display name "Automatos Investor Portal". To: every address in `INVESTOR_ALERT_EMAILS`.
- **Off**: with no recipients, or without `SMTP_USER` or `SMTP_PASS`, the hooks do nothing and `start()` logs one warning naming the reason (variable names only).
- **Content**: plain text and HTML from the same rows. Every value is made one line and HTML-escaped. Each email links to the investor's admin page under `ALERT_BASE_URL` (a constant in `alerts.js`, the production site), whatever environment sent it.

---

## Retention

`server/investors/retention.js`. Once the database is ready, `start()` runs a purge, then every 24 hours (the timer does not keep the process alive). In one transaction, for every investor whose `last_seen_at` is more than 6 months old:

- **Not blocked**: the row is deleted; sessions, events and alert records cascade.
- **Blocked**: events, sessions and alert records are deleted and every profile field cleared, but the row keeps its Clerk user ID and `blocked = true`, so the block survives.

A failed purge is logged and tried again at the next tick. `privacy.html` section 07 states the same rule, and `server/investors/__tests__/site-links.test.js` reads that section; change both together.

---

## Rate limits

`server/investors/rate-limit.js`: express-rate-limit keyed by the investor ID the guard set (never the IP), one minute windows, in memory per process. Over the limit: `429 {"error":"rate_limited"}`.

| Route | Limit per investor per minute |
|---|---|
| `PUT /me` | 10 |
| `POST /documents/:id/link` | 30 |
| `POST /sessions` | 20 |
| `POST /events` | 120 |

Admin routes have no rate limit.

---

## Configuration

The server reads its configuration once, when it starts (`server/investors/config.js`, `readPortalConfig`), so any change needs a restart or redeploy. Values are trimmed and a blank value counts as unset, except the SMTP ones, which are read exactly as the contact form reads them. Logs name variables, never their values.

| Variable | Read by | Purpose | Required |
|---|---|---|---|
| `INVESTORS_DATABASE_URL` | server | Postgres connection string for the portal's own role; data lives in schema `investors` | yes |
| `CLERK_SECRET_KEY` | server | Verifies session tokens and reads a new user's name and email from Clerk | yes |
| `CLERK_PUBLISHABLE_KEY` | server (required check); `server.js` writes it into `_config.js` for the app | Clerk's key for the browser. Only a well-formed `pk_test_` or `pk_live_` key is written into `_config.js` | yes |
| `INVESTORS_AUTHORIZED_PARTIES` | server | Comma-separated origins a session token may come from (its `azp`). Unset means the production origin (`DEFAULT_AUTHORIZED_PARTIES` in `config.js`) | no |
| `INVESTOR_ADMIN_CLERK_IDS` | server | Comma-separated Clerk user IDs allowed into `/admin`. Unset means no admins | for the admin area |
| `INVESTOR_DOCS_BUCKET` | server | The private S3 bucket for documents | for documents: all four, or the document routes answer 503 |
| `INVESTOR_DOCS_REGION` | server | The bucket's region | for documents |
| `INVESTOR_DOCS_ACCESS_KEY_ID` | server | Access key of an IAM user limited to that bucket | for documents |
| `INVESTOR_DOCS_SECRET_ACCESS_KEY` | server | That access key's secret | for documents |
| `INVESTOR_ALERT_EMAILS` | server | Comma-separated recipients of the alert emails | no (no alerts without it) |
| `SMTP_HOST` | server (shared with the contact form) | SMTP host; has a default in code | no |
| `SMTP_PORT` | server (shared with the contact form) | SMTP port; has a default in code | no |
| `SMTP_USER` | server (shared with the contact form) | SMTP user and the alerts' From address | for alerts |
| `SMTP_PASS` | server (shared with the contact form) | SMTP password | for alerts |
| `PORT` | `server.js` | The port the site listens on; Railway sets it | no |
| `INVESTORS_TEST_DATABASE_URL` | server tests only | Points the server tests at a real Postgres instead of PGlite. The tests drop the `investors` schema there | tests only |
| `VITE_INVESTORS_E2E` | app build only | Set to `1` by `npm run build:e2e` to build with the fake sign-in; never set for production | e2e build only |

The three required variables decide whether the portal starts at all; if any is unset the state is `disabled` with the reason `missing_config: <names>`. `.env.example` lists only the site's variables, not the portal's; this table and the top-level `README.md` list them.

---

## Health and logs

### `GET /api/investors/health`

Public, no token, `Cache-Control: no-store`. Always `200` with one field:

| `state` | Meaning |
|---|---|
| `disabled` | A required variable is unset, or a migration failed. Every other API path answers 503. |
| `starting` | Config is complete and the database is being opened and migrated. Every other API path answers 503. |
| `ready` | The portal is serving. |

It does not give the reason (that is in the log), and it does not check document storage, SMTP or Clerk. Once `ready`, it does not re-check the database.

### Log lines

Everything the portal logs starts with `[investors]` and never includes a token, a connection string, a presigned URL or an email body.

| Line | Meaning |
|---|---|
| `portal disabled: missing_config: <names>` | A required variable is unset |
| `portal disabled: migration <file> failed: <detail>` | A migration failed and was rolled back |
| `migrations applied: <files>` | Files applied at this start |
| `alert emails off: <reason>` | No recipients, no SMTP credentials, or the transport could not be built |
| `token rejected: <reason>` | A token failed verification |
| `<METHOD> <path> failed: <error>` | An unexpected error; the request got a 500 |
| `admin <id> exported <n> investors as CSV` | A CSV export (the admin's portal ID, never the contents) |
| `admin <id> blocked investor <id>`, `... unblocked ...`, `... deleted investor <id>` | Admin actions on investors |
| `could not remove a file in documents/<id>/v<n>: <error name>` | A replaced or rejected file was left in the bucket |
| `alert '<signup or firstOpen>' failed: <error name (code)>` | An alert could not be claimed or sent |
| `retention (6 months): deleted <n> investor(s), cleared <m> blocked` | A purge removed something |
| `retention purge failed: <message>` | A purge failed; it runs again tomorrow |
| `app build unavailable (<code>): /investors answers 503` | `investors/dist` is missing (logged once) |
| `idle database client error: <message>` | The pool lost a connection; handled so it cannot crash the site |

---

## Build and CI

### The image

`Dockerfile`, three stages on `node:22-alpine`:

1. **investors-build**: `npm ci` and `npm run build` in `investors/`, producing `investors/dist`.
2. **site**: the repository without `investors/`.
3. **runtime**: the root package's production dependencies, the site, and `investors/dist`. `CMD ["node", "server.js"]`, `PORT` 80 by default.

The runtime image carries the app's build, never its source. `.dockerignore` also leaves out the app's dependencies and test output, `server/investors/__tests__`, `README.md` and `design/`. The `docs/` folder is copied into the image but not served: `server.js` serves only its allow-list.

### `.github/workflows/investors.yml`

Runs on every pull request and on pushes to `main`, Node 22, with a newer run cancelling an older one on the same ref.

| Job | What it runs |
|---|---|
| `server` | `npm test` at the root (vitest), against a Postgres 16 service (`INVESTORS_TEST_DATABASE_URL` set) |
| `app` | In `investors/`: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, then the KP10 check |
| `e2e` | After `app`: installs Chromium, `npm run build:e2e`, `npx playwright test`; uploads the screenshots and the HTML report |
| `docker` | `docker build` of the image, no push |

**The KP10 check** (no fake sign-in in production): the e2e build replaces Clerk with a fake that signs in from `localStorage` (`investors/src/auth/fake-auth.tsx`). Its marker string, `INVESTORS_E2E_FAKE_AUTH`, lives in `investors/src/auth/fake-session.ts`. `AUTH_MODE` (`investors/src/auth/mode.ts`) is decided at build time from `VITE_INVESTORS_E2E`, so the production build folds to Clerk and drops the fake. The `app` job greps `investors/dist` for the marker and fails if it is there.

**E2E screenshots**: every spec saves full-page screenshots through `capture()` (`investors/e2e/fixtures/screens.ts`) at two sizes, desktop 1280 by 800 and phone 390 by 844 (touch, device scale 2), in UTC, `en-GB`, light colour scheme. They are uploaded as the `investors-e2e-screenshots` artifact; the HTML report as `investors-e2e-report`.

The repository's `malware-scan.yml` also runs on every push and pull request.

---

## Deploy

Production runs on Railway. The service builds this repository's `main` branch with the `Dockerfile`; the repository holds no Railway config file, so the service, its branch and its variables are set in Railway itself. The top-level `README.md`'s deploy section covers the site; the portal adds the variables in [Configuration](#configuration). A deploy needs nothing else from the portal: migrations run on start.

### One-time production setup

These steps are done once per environment, outside this repository:

1. **Postgres.** Create a role for the portal and a schema named `investors` owned by that role, on a Postgres server the service can reach. Put the role's connection string in `INVESTORS_DATABASE_URL`. `migrate.js` creates the tables on first start.
2. **Clerk.** Use a production Clerk instance for the site's domain. Put its secret key in `CLERK_SECRET_KEY` and its publishable key in `CLERK_PUBLISHABLE_KEY`. Enable the sign-in methods you want in the Clerk dashboard. If the site is served from an origin other than the default, list it in `INVESTORS_AUTHORIZED_PARTIES`.
3. **S3.** Create a private bucket (public access blocked, encrypted at rest). Give it a CORS rule for the site's origin allowing at least `GET` (pdf.js fetches the file) and `PUT` (the admin's browser uploads it); the upload sends a `Content-Type` header, so the rule must allow that header. No Range header is needed (see [Viewing](#viewing)). Create an IAM user limited to that bucket, able to put, get and delete its objects and to list the bucket (without list permission S3 answers 403 instead of 404 for a missing object, and finalize fails). Set the four `INVESTOR_DOCS_*` variables.
4. **Admins.** Put the admins' Clerk user IDs in `INVESTOR_ADMIN_CLERK_IDS`.
5. **Alerts.** Put the recipients in `INVESTOR_ALERT_EMAILS`. The SMTP variables are the contact form's.
6. **Check.** After the deploy, `GET /api/investors/health` should answer `{"state":"ready"}`, and the log should have no `[investors] portal disabled` or `alert emails off` line you did not expect.

---

## Testing

The commands, as CI runs them (`README.md`, Checks):

```sh
npm test                                # server tests (vitest)
npm --prefix investors run typecheck    # also: lint, test, build, build:e2e
```

Playwright runs in CI only; its config builds nothing itself and serves `investors/dist-e2e` with `vite preview`.

### Server tests

`server/investors/__tests__/*.test.js`, vitest in Node (`vitest.config.js`).

- **Database**: by default each test database is a fresh in-process PGlite (real Postgres compiled to WASM), migrated with the real migration files. With `INVESTORS_TEST_DATABASE_URL` set (CI's Postgres service), they use `pg` against that database instead, drop the `investors` schema first, and run one file at a time. Never point it at a database that matters.
- **No real Clerk**: `@clerk/backend` is aliased to a stub (`helpers/clerk-sdk.js`) in `vitest.config.js`, so no test can load the real SDK or call Clerk.
- **Helpers** in `server/investors/__tests__/helpers/`: `fake-clerk.js` (unsigned test tokens and invented people), `fake-doc-store.js` (a Map-backed store that applies the real upload checks), `investor-fixtures.js` (rows with chosen times for the admin tests) and `test-db.js`.
- **Coverage by file**: `route-coverage` (KP3), `auth` and `auth-clerk` (the guard and the Clerk verifier), `config`, `db`, `migrate`, `portal-status` (disabled, starting, ready), `static`, `me`, `documents`, `events`, `admin-documents`, `admin-documents-upload`, `admin-document-stats`, `admin-investors`, `admin-investors-detail`, `admin-investors-csv`, `admin-overview`, `sections`, `alerts`, `retention`, `s3`, and `site-links` (the privacy section, its retention period, the footer link and the tracking notice's link).

### App unit tests

`investors/src/**/__tests__/*.test.{ts,tsx}`, vitest with jsdom and Testing Library (`investors/vitest.config.ts`, setup in `investors/src/test/setup.ts`). Shared fixtures are in `investors/src/test/fixtures.ts`, providers in `investors/src/test/providers.tsx`. Most logic sits in pure modules (`*-model.ts`, `link-model.ts`, `visibility-model.ts`, `card-rows.ts`, `queue.ts` and others) tested directly; pages are tested with the API mocked.

### End-to-end tests

`investors/e2e/*.spec.ts`, Playwright on Chromium, against the e2e build with the fake sign-in. `investors/e2e/fixtures/api.ts` mocks the whole outside world: the runtime config, every `/api/investors` call and the storage links. Nothing reaches a real API, Clerk or S3. Every person and document in the fixtures is invented.

| Spec | Covers |
|---|---|
| `investor.spec.ts` | Signed-out page in both moods, the profile form, Home, the founder card rows, the viewer, a non-admin at `/admin` |
| `pitch.spec.ts` | The pitch block and present mode |
| `video.spec.ts` | The video player and a refused link |
| `sections.spec.ts` | The overview, Team, Story (published and not), FAQ and Contact |
| `storage-outage.spec.ts` | Home with storage down |
| `admin.spec.ts` | Overview, investors table, investor detail, documents |
| `admin-content.spec.ts` | The section editor and document stats |
| `favicon.spec.ts` | The portal's tab icon |
| `fixtures.spec.ts` | The generated two-page PDF fixture (`fixtures/pdf.ts`) |

The other fixture files are `data.ts` (documents, investors, overview), `sections.ts`, `markdown.ts`, `stats.ts` and `screens.ts` (screenshots, waiting for images and for pdf.js to paint).

---

## Adding a section

A section is a row in `investors.sections` that admins edit; there is no create or delete route. `005_founder_card_section.sql` and `006_story_section.sql` show the pattern. For a new page section, `<slug>`:

1. **Seed migration.** Add `server/investors/migrations/<next number>_<slug>_section.sql`:

   ```sql
   INSERT INTO investors.sections (slug, title, body_md, sort_order, published) VALUES
     ('<slug>', '<Title>', '', <next sort order>, false)
   ON CONFLICT DO NOTHING;
   ```

   Empty and unpublished, so nothing shows until an admin writes and publishes it, with no further deploy. The slug must match `^[a-z0-9_-]{1,60}$`. `sort_order` sets the admin list's order only; the investor menu's order comes from the app.
2. **Server.** No route change: `routes/sections.js` serves any seeded slug. Update its header comment, and add a case to `server/investors/__tests__/sections.test.js`.
3. **App.**
   - `investors/src/sections/sections-model.ts`: add the slug to `SectionSlug`, and for a page to `PAGE_SECTIONS`, in menu order.
   - `investors/src/admin/section-paths.ts`: add it to `SLUGS`, or the admin list hides the row and its editor says there is no such section.
   - For a page: its path in `investors/src/sections/paths.ts`; a page component like `investors/src/pages/Story.tsx` (`<SectionPage slug="<slug>" />`); its route in `investors/src/App.tsx`; its icon in `SECTION_ICONS` in `investors/src/layout/nav.ts`.
   - `investors/src/strings.ts`: `nav.<slug>`, `sections.titles.<slug>` and `admin.sections.places.<slug>`.
4. **Tests.** The Story change shows what to extend: the section fixtures (`investors/src/sections/__tests__/fixtures.ts`, `investors/src/admin/__tests__/section-fixtures.ts`, `investors/e2e/fixtures/sections.ts`), `section-nav.test.ts`, `section-pages.test.tsx`, `sections-model.test.ts`, `admin-sections.test.tsx`, `home-model.test.ts` and `investors/e2e/sections.spec.ts`.
5. **Docs.** Add the section to the tables in [USER-GUIDE.md](USER-GUIDE.md#sections) and [Migrations](#migrations).

A section that is not a page (like `founder_card`) skips the page steps and needs its own reader where it shows: `founder_card` is read by `investors/src/company/card-rows.ts` and previewed by `investors/src/admin/SectionPreview.tsx`.
