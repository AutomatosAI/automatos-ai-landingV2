#!/bin/bash
# Acceptance gate — automatos.app investor portal, wave 1 (kit: portal-w1).
#   bash scripts/ralph/acceptance-prd001-portal-w1.sh                # full: local checks + the wave's one CI run
#   bash scripts/ralph/acceptance-prd001-portal-w1.sh --no-ci        # local checks only (what a build session runs)
#   bash scripts/ralph/acceptance-prd001-portal-w1.sh --print-base   # the diff base every check uses
#   GATE_BASE=<ref> overrides the base (smoke runs only).
# Base: the merge-base of HEAD with origin/main (falls back to main).
# KP1 is enforced as an ALLOWLIST of changed paths; KP2 as an allowlist of packages and majors.
# No pipefail; each check in its own `( eval … )`; stdin closed. Negative checks read the wave's ADDED lines
# in product code (tests and the kit excluded); on the base they pass by construction.
set -u
exec </dev/null
cd "$(dirname "$0")/../.." || exit 1
export PATH="$PATH:/opt/homebrew/bin:$HOME/.local/bin"   # appended: nvm's Node 22 (set by the launcher) must stay first

KIT=scripts/ralph/prd-001-portal-w1.json
if [ -n "${GATE_BASE:-}" ]; then
  BASE=$(git rev-parse --verify -q "$GATE_BASE^{commit}") || { echo "GATE_BASE $GATE_BASE does not resolve"; exit 1; }
else
  BASE=$(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main 2>/dev/null) \
    || { echo "cannot resolve a merge-base with origin/main"; exit 1; }
fi
MODE=full
case "${1:-}" in --print-base) echo "$BASE"; exit 0 ;; --no-ci) MODE=no-ci ;; "") ;; *) echo "unknown argument: $1"; exit 2 ;; esac
echo "base: $(git log -1 --format='%h %s' "$BASE") · HEAD: $(git log -1 --format='%h %s' HEAD) · mode: $MODE · node: $(node -v 2>/dev/null || echo MISSING)"
FAIL=0
check() { local name="$1" body="$2"; echo ""; echo "── $name"; if ( eval "$body" ); then echo "   ✅ PASS: $name"; else echo "   ❌ FAIL: $name"; FAIL=1; fi; }
warn()  { local name="$1" body="$2"; echo ""; echo "── $name"; if ( eval "$body" ); then echo "   ✅ ok: $name"; else echo "   ⚠️  WARN (not a failure): $name"; fi; }

CI_JOBS=(server app docker e2e)
# KP1: the wave's own paths.
OWN='^(investors/|server/investors/|vitest\.config\.js$|server\.js$|_config\.js\.template$|Dockerfile$|\.dockerignore$|package\.json$|package-lock\.json$|\.github/workflows/investors\.yml$|README\.md$|\.gitignore$|scripts/ralph/(prd-001-portal-w1\.json|PROMPT_build_prd001-portal-w1\.md|PROMPT_review_prd001-portal-w1\.md|acceptance-prd001-portal-w1\.sh)$)'
PRODUCT_PATHS=(investors server/investors server.js Dockerfile README.md _config.js.template .github/workflows/investors.yml)

changed() { git diff --name-only "$BASE"..HEAD; }
outside_kp1() { changed | grep -vE "$OWN" | grep -v '^$'; }
added_product() {
  git diff "$BASE"..HEAD -- "${PRODUCT_PATHS[@]}" ':!*__tests__*' ':!*.test.*' ':!investors/e2e/*' \
    | grep '^+' | grep -v '^+++'
}
added_all() { git diff "$BASE"..HEAD -- . ':!scripts/ralph/*' ':!package-lock.json' ':!investors/package-lock.json' | grep '^+' | grep -v '^+++'; }
every_commit_signed() { [ -z "$(git log --no-merges --format='%H %(trailers:key=Signed-off-by,valueonly)' "$BASE"..HEAD | awk 'NF<2{print $1}')" ]; }
file_sizes_ok() {
  local f n bad=0
  for f in $(git diff --name-only --diff-filter=AM "$BASE"..HEAD -- investors server/investors | grep -E '\.(ts|tsx|js|mjs)$'); do
    [ -f "$f" ] || continue
    n=$(wc -l < "$f" | tr -d ' ')
    [ "$n" -le 800 ] || { echo "   $f: $n lines"; bad=1; }
  done
  [ $bad -eq 0 ]
}
npm_here() { [ -f "$1/package.json" ] || { echo "   no package.json in $1 — refusing to run npm (it would climb to a parent)"; return 1; }; }

# server.js: additive only. The public allow-list arrays are byte-identical to the base, and the only removed
# lines are hydrateConfig's .replace(...) lines (one may be re-added with a new terminator).
array_block() { awk -v name="$1" 'index($0, "const " name " = [") {on=1} on {print} on && /\];/ {exit}'; }
server_allowlist_unchanged() {
  local a bad=0
  for a in CLEAN_URL_PAGES HTML_ONLY_PAGES PUBLIC_ASSETS; do
    if [ "$(git show "$BASE:server.js" | array_block "$a")" != "$(array_block "$a" < server.js)" ]; then
      echo "   $a changed"; bad=1
    fi
  done
  [ $bad -eq 0 ]
}
server_removed_lines_ok() {
  local removed
  removed=$(git diff "$BASE"..HEAD -- server.js | grep '^-' | grep -v '^---' | grep -vE '^-[[:space:]]*\.replace\(/\\\$\\\{VITE_AUTOMATOS_[A-Z_]+\\\}/g' || true)
  [ -z "$removed" ] || { echo "$removed" | head -10 | sed 's/^/   removed: /'; return 1; }
}
mount_before_json() {
  local api json
  api=$(grep -nE "app\.use\([\"']/api/investors[\"']" server.js | head -1 | cut -d: -f1)
  json=$(grep -n 'app.use(express.json())' server.js | head -1 | cut -d: -f1)
  [ -n "$api" ] && [ -n "$json" ] && [ "$api" -lt "$json" ] || { echo "   /api/investors mount line ${api:-missing}, express.json line ${json:-missing}"; return 1; }
}

# KP2: packages and majors.
deps_ok() {
  node --input-type=module -e '
import { readFileSync, existsSync } from "node:fs";
const allow = {
  "package.json": {
    dependencies: { "compression": null, "express": null, "nodemailer": null, "@clerk/backend": "3", "pg": "8",
      "@aws-sdk/client-s3": "3", "@aws-sdk/s3-request-presigner": "3", "zod": "3", "express-rate-limit": "7" },
    devDependencies: { "vitest": "3", "supertest": "7", "@electric-sql/pglite": "0.5" },
  },
  "investors/package.json": {
    dependencies: { "react": "18", "react-dom": "18", "react-router-dom": "6", "@tanstack/react-query": "5",
      "@clerk/clerk-react": "5", "react-pdf": "9", "pdfjs-dist": "4.8.69", "recharts": "2", "lucide-react": "0",
      "class-variance-authority": "0.7", "clsx": "2", "tailwind-merge": "2", "tailwindcss-animate": "1", "sonner": "2", "zod": "3" },
    devDependencies: { "vite": "6", "@vitejs/plugin-react": "4", "typescript": "5", "tailwindcss": "3", "postcss": "8",
      "autoprefixer": "10", "eslint": "9", "@eslint/js": "9", "typescript-eslint": "8", "eslint-plugin-react-hooks": "5",
      "eslint-plugin-react-refresh": "0", "globals": null, "vitest": "3", "jsdom": "26", "@testing-library/react": "16",
      "@testing-library/jest-dom": "6", "@types/react": "18", "@types/react-dom": "18", "@types/node": "22",
      "@playwright/test": "1.64.1" },
  },
};
const bad = [];
for (const [file, sections] of Object.entries(allow)) {
  if (!existsSync(file)) { if (file === "package.json") bad.push("package.json missing"); continue; }
  const pkg = JSON.parse(readFileSync(file, "utf8"));
  for (const section of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
    for (const [name, spec] of Object.entries(pkg[section] ?? {})) {
      const rules = sections[section] ?? {};
      const radix = file.startsWith("investors") && section === "dependencies" && name.startsWith("@radix-ui/react-");
      if (!(name in rules) && !radix) { bad.push(`${file} ${section}: ${name} is not in KP2`); continue; }
      const want = rules[name];
      if (want == null) continue;
      const v = String(spec).replace(/^[~^=]/, "");
      const ok = want.split(".").length === 3 ? v === want : (v === want || v.startsWith(want + "."));
      if (!ok) bad.push(`${file} ${section}: ${name}@${spec} — KP2 wants ${want}`);
    }
  }
}
if (bad.length) { console.log(bad.map((b) => "   " + b).join("\n")); process.exit(1); }
'
}
no_env_or_docs() {
  local hits
  hits=$(git diff --name-only --diff-filter=A "$BASE"..HEAD | grep -E '(^|/)\.env|\.env\.|/credentials|/secrets?/|\.pem$|\.key$|_rsa|\.(pptx|xlsx|docx|mp4|mov|key)$' || true)
  [ -z "$hits" ] || { echo "$hits" | sed 's/^/   /'; return 1; }
  hits=$(git diff --name-only --diff-filter=A "$BASE"..HEAD | grep -E '\.pdf$' | grep -vE '^(investors/e2e/fixtures/|server/investors/__tests__/fixtures/)' || true)
  [ -z "$hits" ] || { echo "$hits" | sed 's/^/   PDF outside fixtures: /'; return 1; }
  local f n bad=0
  for f in $(git diff --name-only --diff-filter=A "$BASE"..HEAD | grep -E '\.pdf$'); do
    n=$(wc -c < "$f" | tr -d ' '); [ "$n" -le 20480 ] || { echo "   $f: $n bytes"; bad=1; }
  done
  [ $bad -eq 0 ]
}
no_secrets() { ! added_all | grep -nE 'sk_live_[A-Za-z0-9]|pk_live_[A-Za-z0-9]{8}|sk_test_[A-Za-z0-9]{16}|AKIA[0-9A-Z]{16}|BEGIN [A-Z ]*PRIVATE KEY|postgres(ql)?://[^:@/ ]+:[^@/ ]{6,}@[a-z0-9.-]+\.(rlwy|railway|proxy)' ; }
no_reference_vendors() { ! added_product | grep -inE "${RALPH_BRAND_DENYLIST:-supabase|lovable}" ; }
no_console_log() { ! added_product | grep -nE 'console\.log\(' ; }

echo ""; echo "=== Kit"
check "kit json is valid and every story passes" "jq -e '[.userStories[] | select(.passes != true)] | length == 0' $KIT >/dev/null || { jq -r '.userStories[] | select(.passes != true) | \"   not done: \" + .id' $KIT; false; }"

echo ""; echo "=== Scope (KP1, KP2, KP5)"
check "every changed path is inside KP1" "[ -z \"\$(outside_kp1)\" ] || { outside_kp1 | sed 's/^/   outside KP1: /'; false; }"
check "server.js: the public allow-list arrays are unchanged" "server_allowlist_unchanged"
check "server.js: additive only (no removed line but hydrateConfig's replace lines)" "server_removed_lines_ok"
check "server.js: /api/investors is mounted before express.json()" "mount_before_json"
check "packages and majors match KP2" "deps_ok"
check "no env files, keys or real documents committed; fixtures tiny" "no_env_or_docs"
check "no secrets in added lines" "no_secrets"
check "no reference-portal brands or vendors in product code (KP12)" "no_reference_vendors"
check "no console.log in product code (KP15)" "no_console_log"
check "every commit is signed off (DCO)" "every_commit_signed"
check "new source files <= 800 lines" "file_sizes_ok"
warn  "story commits carry [skip ci] (all but the wave's CI commit)" "[ -z \"\$(git log --no-merges --format='%s' $BASE..HEAD^ | grep -v 'skip ci' | grep -v 'portal wave 1 built, run CI')\" ]"

echo ""; echo "=== Contract files"
check "the route-coverage test exists (KP3)" "[ -f server/investors/__tests__/route-coverage.test.js ]"
check "migrations are plain SQL under server/investors/migrations (KP8)" "ls server/investors/migrations/*.sql >/dev/null 2>&1"
check "Dockerfile builds the app in its own stage" "grep -q 'AS investors-build' Dockerfile && grep -q 'COPY --from=investors-build' Dockerfile"
check "investors.yml has the server, app, docker and e2e jobs" "for j in server app docker e2e; do grep -qE \"^  \$j:\" .github/workflows/investors.yml || { echo \"   missing job \$j\"; exit 1; }; done"
check "the app's index.html is noindex" "grep -q 'noindex' investors/index.html"

echo ""; echo "=== Local checks (pure Node, KP6)"
check "server JS parses (node --check)" "node --check server.js && for f in \$(git ls-files 'server/investors/*.js' 'server/investors/**/*.js'); do node --check \"\$f\" || exit 1; done"
check "root: npm test (vitest, PGlite)" "npm_here . && npm test --silent"
check "investors: typecheck" "npm_here investors && npm --prefix investors run typecheck --silent"
check "investors: lint" "npm_here investors && npm --prefix investors run lint --silent"
check "investors: unit tests" "npm_here investors && npm --prefix investors test --silent"
check "investors: production build" "npm_here investors && npm --prefix investors run build --silent"
check "production build has no E2E fake auth (KP10)" "[ -d investors/dist ] && ! grep -rl 'INVESTORS_E2E_FAKE_AUTH' investors/dist"
check "E2E build carries the fake auth (the seam works)" "npm --prefix investors run build:e2e --silent && grep -rlq 'INVESTORS_E2E_FAKE_AUTH' investors/dist-e2e"

ci_commit_for_head() {
  local sha; sha=$(git rev-parse HEAD)
  while git log -1 --format=%s "$sha" | grep -q 'skip ci' && [ -z "$(git show --format= --name-only "$sha" | grep -v '^scripts/ralph/')" ]; do
    sha=$(git rev-parse "$sha^")
  done
  echo "$sha"
}
wait_run() {
  local wf="$1" sha="$2" event="$3" waited=0 line
  while :; do
    line=$(gh run list --workflow "$wf" --event "$event" --limit 30 --json databaseId,headSha,status,conclusion --jq ".[] | select(.headSha == \"$sha\") | \"\(.databaseId) \(.status) \(.conclusion)\"" 2>/dev/null | head -1)
    case "$line" in *" completed "*) echo "${line%% *} ${line##* }"; return 0 ;; esac
    [ "$waited" -ge 2700 ] && { echo "   no completed $wf ($event) run for $sha after 45 min (${line:-no run})"; return 1; }
    sleep 60; waited=$((waited + 60))
  done
}
ci_green_on_head() {
  local br sha r id concl jobs job hits
  br=$(git rev-parse --abbrev-ref HEAD); sha=$(ci_commit_for_head)
  [ "$sha" = "$(git rev-parse HEAD)" ] || echo "   HEAD is kit-only [skip ci] commits over $(git log -1 --format=%h "$sha"): reading that commit's runs"
  command -v gh >/dev/null || { echo "   gh is required"; return 1; }
  [ -n "$(gh pr list --head "$br" --state open --json number --jq '.[0].number' 2>/dev/null)" ] || { echo "   no open PR for $br: investors.yml runs on pull_request (and push to main) only"; return 1; }
  r=$(wait_run investors.yml "$sha" pull_request) || { echo "$r"; return 1; }
  id="${r%% *}"
  jobs=$(gh run view "$id" --json jobs --jq '.jobs[] | "\(.conclusion)\t\(.name)"')
  for job in "${CI_JOBS[@]}"; do
    hits=$(echo "$jobs" | awk -F'\t' -v j="$job" '$2 == j {print $1}')
    [ -n "$hits" ] || { echo "   missing job: $job (job names must be exactly: ${CI_JOBS[*]})"; return 1; }
    [ -z "$(echo "$hits" | awk '$0 != "success"')" ] || { echo "   red: $job"; return 1; }
  done
  r=$(wait_run malware-scan.yml "$sha" pull_request) || { echo "$r"; return 1; }
  concl="${r##* }"; [ "$concl" = "success" ] || { echo "   malware-scan: $concl"; return 1; }
  echo "   investors.yml run $id green on ${sha:0:9} (${CI_JOBS[*]}); malware-scan green"
}
if [ "$MODE" = full ]; then
  echo ""; echo "=== CI (once per wave)"
  check "CI: investors.yml (server, app, docker, e2e) and malware-scan green on the tested commit" "ci_green_on_head"
fi
echo ""
if [ "$FAIL" -eq 0 ]; then echo "✅ investor portal wave 1 acceptance ($MODE): PASS"; else echo "❌ investor portal wave 1 acceptance ($MODE): FAIL"; fi
exit "$FAIL"
