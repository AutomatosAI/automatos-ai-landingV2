# Ralph Build Prompt — automatos.app investor portal, wave 2

You are building **wave 2 of the investor portal** at `automatos.app/investors`, ONE story per session, unattended: every story gets a fresh session. Branch **`feat/investor-portal-2`**, in its own worktree, cut from `origin/feat/investor-portal-1` (wave 1, the core; `origin/main` once it merged) of `automatos-ai-landingV2` (the company site: static HTML pages served by a small Express server on Railway). One PR for the wave and one CI run at the end: nothing in a story waits on CI.

**This repository is PUBLIC.** No secrets, no env files, no real documents, no real people (KP5).

- The base for every diff and check is what `bash scripts/ralph/acceptance-prd001-portal-w2.sh --print-base` prints.
- What you build on: wave 1's React app in `investors/` and API in `server/investors/`. Read `scripts/ralph/prd-001-portal-w1.json` (its DONE notes say what exists and where) before anything else. Wave 1's tests must keep passing unchanged (KP19).

## Read first, every iteration

1. `scripts/ralph/prd-001-portal-w2.json` is the BINDING contract: `decisions` KP1–KP19, each story's ACs, `files`, `notes` (earlier stories' DONE notes say what exists and where), `references`.
2. The PRD named in the json's `prd` field, sections 4–12 (READ ONLY; it lives in a private repo: never copy its sections 2, 13, 14 or 15, names of people, or anything about investors or content into this repo).
3. **The code you build on — read the actual files, not your memory:** `server.js`, `_config.js.template`, `Dockerfile`, `.dockerignore`, the earlier stories' files under `server/investors/` and `investors/`, and the installed packages' type definitions under `node_modules` (`@clerk/backend`, `@clerk/clerk-react`, `react-pdf`, `@electric-sql/pglite`, `@aws-sdk/*`, `express-rate-limit`) — never guess an API.
4. The story's references, READ ONLY: academy (`git -C $RALPH_ACADEMY_REPO show origin/main:<path>`) and the reference portal (KP12: read its files, port the UI, strip everything KP12 lists).
5. Your own earlier stories' files: mirror the idiom you already set; never a second pattern.

## Your files — and nobody else's (KP1, gate-enforced)

Only the paths KP1 allows. `server.js`, `Dockerfile` and the root `package.json` stay byte-identical to the base (the gate diffs them). `privacy.html` and `_footer.js` get additions only, in W2-08. Never touch any other `.html` page, the site's other `_*.js`/`*.css`, `images/`, `uploads/`, `content/`, `design/` or `malware-scan.yml`.

## Local checks

Allowed (pure Node, KP6): `npm ci --ignore-scripts`, `npm install --save-exact --ignore-scripts <KP2 package>@<major>` (root or `investors/`), `npm test`, `npm --prefix investors run typecheck|lint|test|build|build:e2e`, `node --check <file>`, `bash scripts/ralph/acceptance-prd001-portal-w2.sh --no-ci|--print-base`, reading `node_modules`.
**NEVER:** `node server.js`, `npm start`, `vite`/`vite dev`/`vite preview`, Playwright, a browser, docker, any server or listening socket (supertest's in-process requests are fine; PGlite is in-process), `gh workflow run`, `git push`, opening a PR, `git merge`. A package outside KP2: `RALPH_BLOCKED`. Never claim a check passed that you did not see pass.

## Code rules

- **Server-side enforcement (KP3):** identity only from the verified Bearer token; admin from `INVESTOR_ADMIN_CLERK_IDS`; the route-coverage test must keep passing — every new route goes through `requireInvestor` (and `/admin/*` through `requireAdmin`). No cookie auth (KP9).
- **Never break the site (KP4):** portal failures mean 503 on portal routes, never a thrown startup error or a changed public route.
- **SQL (KP7, KP8):** parameterized, schema-qualified, through `db.js`; schema changes are new numbered `.sql` files (never edit an applied migration file).
- **S3 (KP11):** short-lived presigned URLs only; never log one.
- **Events (KP16):** open/download written by the server; the client sends only page_view, section_view, video_progress and heartbeats.
- **E2E seam (KP10):** the fake auth exists only behind `VITE_INVESTORS_E2E === '1'`; `npm run build` output never contains `INVESTORS_E2E_FAKE_AUTH`.
- **Look (KP13) and words (KP14):** site tokens and fonts, both moods, phone first; all strings in `investors/src/strings.ts`.
- **Shape (KP15):** immutability; zod at every boundary; files 200–400 lines (never over 800), functions under 50, components under 150, nesting under 4; no `console.log`.
- **File names the secrets hook blocks** (it matches the path, not the content): never `*.env`, `*.env.*`, `*/credentials*`, `*/secrets/*`, `*/secret/*`, `*.pem`, `*.key`, `*_rsa*`, `*/service-account*.json`, `*/sa-key*.json`. Document variable names in README.md. Never work around the hook.
- Tests are part of every story (vitest; server tests under `server/investors/__tests__/`, app tests beside the code in `__tests__/`). Keep React components thin and test their pure models. Never weaken, skip or delete a test or lint rule; no inline lint disable without a one-line reason.

## The execution contract

- **This session ends when your turn ends.** Never end it with background work; never ScheduleWakeup; never "pick up later". Wait in the foreground for everything you start.
- **No reviewer agents in build sessions, except** W2-02 (markdown rendering: XSS) and W2-07 (CSV: formula injection): run the security-reviewer agent in the FOREGROUND on that story's diff and wait for it before committing; fix what it finds in the same story.
- **One story per session.** Build the first story (by `priority`) whose ACs are not all DONE, then STOP (step 5). The priority order is the dependency order.
- **Re-verify every anchor** by reading it before relying on it.

## Commits

- `git commit -s` (DCO) on EVERY commit; message `feat(investors): <story id> — <title>` (or fix/test/docs/chore), **every story commit ends with ` [skip ci]`**, evidence in the body.
- Stage explicit paths only (`git add <path> …`): NEVER `git add -A`, `.`, `-u` or `-f`; never `git stash`; never amend, rebase, cherry-pick, merge or switch branches. `git status --short` before each commit; account for every line. `node_modules/` and build output are never committed.

## Per-iteration protocol

1. Pick the first story (by `priority`) whose ACs are not all DONE. Read its sources, the code it builds on and the package APIs it uses, fresh.
2. Implement it with its tests; run the local checks until green.
3. Commit the story (signed, ` [skip ci]`).
4. Mark it in `scripts/ralph/prd-001-portal-w2.json`: APPEND ` → DONE — <evidence>` to each AC, set `passes` to `true`, add one line to `notes` after ' | ' (packages added with exact versions; anything a later story must know); `jq . scripts/ralph/prd-001-portal-w2.json >/dev/null`; commit that file alone (signed, ` [skip ci]`).
5. **STOP.** Unless that was the last story, end your reply with `STORY_DONE <story id>` as its last line. **RALPH_COMPLETE, RALPH_BLOCKED and STORY_DONE are sentinels the runner reads on your LAST line only (≤ 80 characters): never write them anywhere else.**

## Completion

- **Every story `passes: true`:** run `bash scripts/ralph/acceptance-prd001-portal-w2.sh --no-ci`; fix what is red in signed ` [skip ci]` commits (a gate check that is itself wrong is not yours to loosen: report it and stop with BLOCKED); then ONE signed commit WITHOUT `[skip ci]` — `git commit -s --allow-empty -m "chore(investors): portal wave 2 built, run CI"` — and reply with `RALPH_COMPLETE` as the last line.
- **Already built and tested:** every story `passes: true` and the last commit touching anything outside `scripts/ralph/` is that CI commit (or a later commit without `[skip ci]`): make NO commit; reply `RALPH_COMPLETE` and nothing else.
- **A story cannot be built without breaking a Hard NO** (a package outside KP2, a file outside KP1, a public route that must change): one line of why and the evidence, then `RALPH_BLOCKED` as the last line. The tip must stay green.

## Hard NOs

- NO file outside KP1. NO package outside KP2. NO change to how any existing page of automatos.app is served.
- NO pushing, PRs or merges (the runner pushes `origin feat/investor-portal-2` as a backup and opens the draft PR at the end).
- NO secrets, env files, real documents or real people in the repo (KP5).
- NO work outside wave 2's scope (KP17); no edit to a wave-1 file a story does not name, except a recorded `W1 FIX:` (KP19).
