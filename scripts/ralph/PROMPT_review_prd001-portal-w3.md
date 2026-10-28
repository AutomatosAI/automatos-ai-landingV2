# Ralph Review Prompt — automatos.app investor portal, wave 3

You are a fresh-context **adversarial reviewer**. The build claims wave 3 of the investor portal is complete (`scripts/ralph/prd-001-portal-w3.json`, stories W3-01..W3-04 and any W3-RVW-n), on origin/main where waves 1 and 2 are merged. This repository is PUBLIC and the portal will hold investor data. Find where:

- **tracking (HIGH):** any document link requested because a page rendered (home, the featured block, the video poster) instead of on a press — that inflates 'opens' (KP20); slides seen in present mode not reported as page_view;
- **the storage note (HIGH):** a 503 storage_unavailable still blanking the page, or a plain 503 portal_unavailable no longer showing the full-page screen; Retry not refetching;
- **present mode (MEDIUM):** focus trapped or lost on exit; Esc or the browser's own exit leaving the app in a broken state; keys acting while a text field has focus; swipe firing on vertical scroll; targets under 44 px; motion ignoring prefers-reduced-motion; download unreachable;
- **the featured block (MEDIUM):** the featured deck or video repeated in the groups below; a non-'pitch' category picked; layout broken at 390 px;
- **scope (CRITICAL):** any change outside `investors/**` and this kit's files (server, Dockerfile, packages, site pages); a new package; an existing test weakened or edited without a story naming it;
- shape: a file over 800 lines, a function over 50, a component over 150; colours not from the KP13 tokens; strings outside strings.ts; `console.log`;
- a story's evidence does not exist, or an ownerTest item (OT-W3-1..OT-W3-3) was claimed as done.

You fix NOTHING in the code yourself.

## Scope

```
BASE=$(bash scripts/ralph/acceptance-prd001-portal-w3.sh --print-base)
git diff --stat $BASE..HEAD
git diff $BASE..HEAD
```

Read beside the diff: `scripts/ralph/prd-001-portal-w3.json` (binding) and the wave 1 and 2 kit jsons, the PRD named in its `prd` field (sections 4–12, READ ONLY), `server.js` on the base and at HEAD, and the installed package type definitions the code calls. Never file a finding against a line this diff does not touch.

## Verification

- **This session ends when your turn ends.** Never end it with background work and never ScheduleWakeup: run the gate and every review agent in the FOREGROUND and wait for each before your verdict.
- Run the **code-review** skill (or the code-reviewer agent) on the diff **in the foreground**, and the **security-reviewer** agent in the foreground on the diff (expect little: no server change, no new data path — confirm that and that no link is requested on render). Wait for each.
- Run `bash scripts/ralph/acceptance-prd001-portal-w3.sh` yourself (it reads the wave's one CI run). **Non-zero = automatic CRITICAL.**
- Spot-check four DONE ACs at random against the code and tests; always include one from W3-01 (storage note) and one from W3-03 (no link on render).
- Only pure-Node checks may run on this machine (KP6); never a server, a browser, Playwright or docker; nothing left in the background.

## Verdict

- **No CRITICAL/HIGH/MEDIUM:** a 5-line summary: (a) the storage note; (b) present mode; (c) the featured block and tracking honesty; (d) scope: only investors/** changed, no new package; (e) the owner's next steps (OT-W3-1..OT-W3-3). Then `REVIEW_PASS` as the last line (REVIEW_PASS and REVIEW_FINDINGS appear on your last line only, never in prose).
- **Findings:** append `W3-RVW-n` stories (n continues from the highest existing) to `scripts/ralph/prd-001-portal-w3.json` (same shape: id, prdStory 'review', title, description with `file:line` evidence, acceptanceCriteria with the cause, the change, the test and the checks, files inside KP1 only, priority above the highest existing one, passes false, notes ''), validate with `jq`, commit `git commit -s -m 'chore(investors): wave 3 review findings → fix stories [skip ci]' -- scripts/ralph/prd-001-portal-w3.json`. Then `REVIEW_FINDINGS` as the last line. Do not push.
