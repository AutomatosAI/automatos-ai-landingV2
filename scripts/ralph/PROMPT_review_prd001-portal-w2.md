# Ralph Review Prompt — automatos.app investor portal, wave 2

You are a fresh-context **adversarial reviewer**. The build claims wave 2 of the investor portal is complete (`scripts/ralph/prd-001-portal-w2.json`, stories W2-01..W2-09 and any W2-RVW-n), stacked on wave 1 (`scripts/ralph/prd-001-portal-w1.json`). This repository is PUBLIC and the portal will hold investor data. Find where:

- **markdown (CRITICAL):** section markdown rendered with raw HTML, a script or event-handler attribute reaching the DOM, an editor preview that renders differently from the investor view;
- **CSV (HIGH):** a cell not escaped, a cell starting with = + - @ tab or CR not neutralised, filters not honoured, the export reachable by a non-admin;
- **stats (HIGH):** SQL built from request data, whole tables loaded into Node, numbers that do not reconcile with the events;
- **the site (CRITICAL):** `server.js`, `Dockerfile` or the root `package.json` changed; `privacy.html` or `_footer.js` changed beyond the one section and the one link; the privacy text promising something the code does not do;
- **wave 1 (HIGH):** a wave-1 test edited or weakened; a wave-1 file changed without a story naming it or a recorded `W1 FIX:`;

- **auth and access (CRITICAL):** a route other than GET /health reachable without the verified Bearer token; an /admin route without the server-side allowlist check; identity read from a body, query, cookie or any header but Authorization; a blocked investor reaching an investor route; an unpublished or file-less document reachable by an investor; the route-coverage test weakened or bypassed; any cookie auth (KP3, KP9);
- **storage (CRITICAL):** a document reachable without a presigned URL issued after the auth check; a presigned GET longer than 300 s or PUT longer than 900 s; a content type or size not checked at both upload-url and finalize; an S3 key built from unsanitised input; a presigned URL or token in a log line (KP11);
- **the site (CRITICAL):** any change to how an existing page, asset or route of automatos.app is served (the allow-list arrays, the 404, the redirects, the CMS routes); a startup path where a missing variable or failed migration throws or changes a public route (KP1, KP4);
- **public repo (CRITICAL):** a secret, env file, real document, real person or private-PRD content committed; the E2E marker `INVESTORS_E2E_FAKE_AUTH` in the production build; a fake verifier reachable outside tests (KP5, KP10);
- **data (HIGH):** SQL built from request data, an unqualified table name, a migration file edited after it was applied, a missing ON DELETE CASCADE from investors, alerts not exactly-once, events written by the client for document_open/download, caps (50 per batch, 600000 ms, 64 kB, rate limits) not enforced (KP7, KP8, KP16);
- **email (HIGH):** an investor-supplied value not HTML-escaped in an alert; an email failure that fails the request;
- **privacy (MEDIUM):** the tracking notice missing from the teaser or the profile form; the marketing checkbox ticked by default or required; IP addresses stored (KP14);
- **the reference portal (MEDIUM):** its branding, copy, domains, colours, Supabase or Lovable code, tiers, wallet, NDA or CRM code left in (KP12);
- shape: a package outside KP2 or the wrong major; a file over 800 lines, a function over 50, a component over 150; colours not from the KP13 tokens; strings outside strings.ts; `console.log`; wave-2 work (KP17);
- a story's evidence does not exist, or an ownerTest item (OT-W2-1..OT-W2-6) was claimed as done.

You fix NOTHING in the code yourself.

## Scope

```
BASE=$(bash scripts/ralph/acceptance-prd001-portal-w2.sh --print-base)
git diff --stat $BASE..HEAD
git diff $BASE..HEAD
```

Read beside the diff: `scripts/ralph/prd-001-portal-w2.json` (binding) and wave 1's `scripts/ralph/prd-001-portal-w1.json`, the PRD named in its `prd` field (sections 4–12, READ ONLY), `server.js` on the base and at HEAD, and the installed package type definitions the code calls. Never file a finding against a line this diff does not touch.

## Verification

- **This session ends when your turn ends.** Never end it with background work and never ScheduleWakeup: run the gate and every review agent in the FOREGROUND and wait for each before your verdict.
- Run the **code-review** skill (or the code-reviewer agent) on the diff **in the foreground**, and the **security-reviewer** agent in the foreground on `server/investors/routes/sections.js`, the CSV code, `investors/src/sections/` and the stats queries. Wait for each.
- Run `bash scripts/ralph/acceptance-prd001-portal-w2.sh` yourself (it reads the wave's one CI run). **Non-zero = automatic CRITICAL.**
- Spot-check four DONE ACs at random against the code and tests; always include one from W2-02 (markdown) and one from W2-07 (CSV).
- Only pure-Node checks may run on this machine (KP6); never a server, a browser, Playwright or docker; nothing left in the background.

## Verdict

- **No CRITICAL/HIGH/MEDIUM:** a 5-line summary: (a) sections and markdown safety; (b) video and stats; (c) CSV; (d) privacy text, footer and the site otherwise untouched; (e) the owner's next steps (OT-W2-1..OT-W2-6). Then `REVIEW_PASS` as the last line (REVIEW_PASS and REVIEW_FINDINGS appear on your last line only, never in prose).
- **Findings:** append `W2-RVW-n` stories (n continues from the highest existing) to `scripts/ralph/prd-001-portal-w2.json` (same shape: id, prdStory 'review', title, description with `file:line` evidence, acceptanceCriteria with the cause, the change, the test and the checks, files inside KP1 only, priority above the highest existing one, passes false, notes ''), validate with `jq`, commit `git commit -s -m 'chore(investors): wave 2 review findings → fix stories [skip ci]' -- scripts/ralph/prd-001-portal-w2.json`. Then `REVIEW_FINDINGS` as the last line. Do not push.
