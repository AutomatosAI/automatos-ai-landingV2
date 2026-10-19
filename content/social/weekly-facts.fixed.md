# Automatos Weekly Social Facts — FIXED FORMAT
#
# Headline grammar (CRITICAL for templates to render correctly):
#   - 2–4 lines, separated by `|`
#   - ALL CAPS, max ~10 chars per line
#   - Optional `@brick` suffix on a line/word to brick-color it
#   - NO long Title-Case words like "Workspace" or "Coordination"
#     They overflow at the display weight (Inter Black 100–170px).
#
# Card grammar:
#   - `Heading|Body` — heading should be ≤ 28 chars, body ≤ 160 chars.
#
# Stat grammar:
#   - `Value|Body` — value ≤ 6 chars (e.g. "10+", "$2B", "1,000+"), body ≤ 60 chars.

- week_start: 2026-05-04
- owner: SOCIAL OPS
- consumer_playbook: Automatos Instagram Carousel - Daily Fact Post
- path: content/social/weekly-facts.md

- id: 2026-w18-mon-agents
  day: Monday
  template: definition
  topic: Agents
  headline: WHAT IS|AN@brick|AGENT?
  required_fields:
    headline: WHAT IS|AN@brick|AGENT?
    eyebrow: FIRST — THE CONCEPT
    card_1: Roles, configured|Chatbot, worker, researcher, coder — each agent ships with a role and a scoped permission band.
    card_2: Skills, scoped|Skills are tool sets bound to a role. An agent only sees what its skill graph allows.
    card_3: Loops, autonomous|Plan → act → observe → repeat. Agents drive workflows end-to-end, not turn-by-turn.
  cta: How agents work →

- id: 2026-w18-tue-playbooks
  day: Tuesday
  template: definition
  topic: Playbooks
  headline: WHAT IS|A@brick|PLAYBOOK?
  required_fields:
    headline: WHAT IS|A@brick|PLAYBOOK?
    eyebrow: HOW IT FITS TOGETHER
    card_1: Sequenced steps|A playbook is an ordered, named graph of agent steps. Reads like a recipe, runs like a CI job.
    card_2: Multi-agent ready|Hand off between agents mid-graph — the harness routes context automatically.
    card_3: Repeatable|Same steps every run. Run a playbook by hand, on a cron schedule or from a trigger.
  cta: Build your first playbook →

- id: 2026-w18-wed-workspace-tools
  day: Wednesday
  template: stats
  topic: Workspace Tools
  headline: THE|WORKSPACE.@brick|EVERYTHING|IN ONE PLACE.
  required_fields:
    headline: THE|WORKSPACE.@brick|EVERYTHING|IN ONE PLACE.
    eyebrow: WORKSPACE TOOLS
    stat_1: 400+|Skills in the Studio marketplace
    stat_2: 5+|File types parsed natively
    stat_3: 1,000+|Apps through Composio
    card_1: Code & docs|Code Canvas: your workspace files in an editor, where an agent edits files and runs commands.
    card_2: Data & integrations|Connect Postgres, Snowflake, Slack, Linear — one auth, one config.
  cta: Tour the workspace →

- id: 2026-w18-thu-missions
  day: Thursday
  template: definition
  topic: Missions
  headline: WHAT IS|A@brick|MISSION?
  required_fields:
    headline: WHAT IS|A@brick|MISSION?
    eyebrow: AUTONOMOUS COORDINATION
    card_1: One goal, many agents|A Mission is a single objective broken into tasks across specialist agents.
    card_2: Decomposed at runtime|The harness splits the goal — you don't write the task tree by hand.
    card_3: Hands-off execution|Agents run, retry, and converge. You review the output, not the steps.
  cta: See Missions in action →

- id: 2026-w18-fri-routing
  day: Friday
  template: stats
  topic: Routing
  headline: SMART|ROUTING.@brick|RULES|FIRST.
  required_fields:
    headline: SMART|ROUTING.@brick|RULES|FIRST.
    eyebrow: WHY IT MATTERS
    stat_1: 200+|Built-in platform actions
    stat_2: 20+|Playbooks in the Studio marketplace
    stat_3: 400+|Models through OpenRouter
    card_1: Skill matching|Tasks the rules don't settle are scored against every available agent's skill graph.
    card_2: Rules first|Cache and rules answer first; semantic and LLM tiers run only when they're needed.
  cta: How routing works →

- id: 2026-w18-sat-renderer
  day: Saturday
  template: definition
  topic: Renderer
  headline: HTML|→ PNG.@brick|NO CANVA.
  required_fields:
    headline: HTML|→ PNG.@brick|NO CANVA.
    eyebrow: RENDER PIPELINE
    card_1: HTML templates|Every post is a parameterised page — version it, diff it, code-review it.
    card_2: PNG out, ready to ship|Headless screenshot at exact post dimensions. No re-export, no re-crop.
    card_3: Wired into playbooks|Generate, render, queue, post — one Mission, four steps.
  cta: Inside the renderer →

- id: 2026-w18-sun-approvals
  day: Sunday
  template: announcement
  topic: Approvals
  headline: READY|FOR@brick|APPROVAL.
  required_fields:
    status: ACTIVE
    eyebrow: PROCESS
    headline: READY|FOR@brick|APPROVAL.
    subline: Structured briefs and clean task handoffs, and a person signs off before anything publishes.
    feature_1: Briefs that brief|Designer-ready specs auto-generated from the source playbook
    feature_2: Coordinated handoffs|Reviewers, editors, publishers — each gets just their slice
    feature_3: Human sign-off|Nothing publishes or spends without a person's approval
  cta: Approval workflow →
